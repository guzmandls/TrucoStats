import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { InstallCard } from './InstallCard'
import { InstallScreen } from './InstallScreen'
import { detectPlatform, listenForInstall } from './install'
import { useInstallAction } from './useInstallAction'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'

function useAgent(userAgent: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
}

// Simula la app abierta desde el ícono de la pantalla de inicio.
function asInstalledApp() {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({ matches: query === '(display-mode: standalone)' }) as MediaQueryList,
  )
}

function InstallButton() {
  const { install, dialog } = useInstallAction()
  return (
    <>
      <button onClick={install}>Instalar app</button>
      {dialog}
    </>
  )
}

beforeAll(() => listenForInstall())

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('detectPlatform', () => {
  it('reconoce iPhone, iPad (que se presenta como Mac), Android y computadora', () => {
    expect(detectPlatform(IPHONE, 5)).toBe('ios')
    expect(detectPlatform(MAC, 5)).toBe('ios')
    expect(detectPlatform(MAC, 0)).toBe('other')
    expect(detectPlatform(ANDROID, 5)).toBe('android')
  })
})

describe('InstallCard', () => {
  it('se puede cerrar y no vuelve a aparecer', () => {
    const first = render(<InstallCard onInstall={() => undefined} />)
    expect(screen.getByText('Instalar app')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('Instalar app')).toBeNull()
    first.unmount()

    render(<InstallCard onInstall={() => undefined} />)
    expect(screen.queryByText('Instalar app')).toBeNull()
  })

  it('no aparece si la app ya está instalada', () => {
    asInstalledApp()
    render(<InstallCard onInstall={() => undefined} />)
    expect(screen.queryByText('Instalar app')).toBeNull()
  })
})

describe('Instalar', () => {
  it('en iPhone muestra los pasos de Safari', () => {
    useAgent(IPHONE)
    render(<InstallButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }))

    expect(
      screen.getByRole('dialog', { name: 'Instalar en iPhone' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Agregar a Inicio')).toBeInTheDocument()
    expect(screen.getByText('Abrir como app web')).toBeInTheDocument()
  })

  it('en Android, si Chrome lo permite, abre la instalación del sistema', async () => {
    useAgent(ANDROID)
    render(<InstallButton />)
    const prompt = vi.fn(async () => undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    act(() => {
      window.dispatchEvent(event)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }))
    })

    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('si la instalación del sistema falla, muestra los pasos', async () => {
    useAgent(ANDROID)
    render(<InstallButton />)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(async () => {
        throw new Error('no se pudo')
      }),
      userChoice: new Promise(() => undefined),
    })
    act(() => {
      window.dispatchEvent(event)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }))
    })

    expect(
      screen.getByRole('dialog', { name: 'Instalar en Android' }),
    ).toBeInTheDocument()
  })

  it('en Android sin el aviso de Chrome muestra los pasos del menú', () => {
    useAgent(ANDROID)
    render(<InstallButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }))

    expect(
      screen.getByRole('dialog', { name: 'Instalar en Android' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByText('Instalar app'),
    ).toBeInTheDocument()
  })
})

describe('InstallScreen (/instalar)', () => {
  it('si ya está instalada, lo dice', () => {
    asInstalledApp()
    render(
      <MemoryRouter>
        <InstallScreen />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ya tienes la app instalada')).toBeInTheDocument()
  })

  it('en iPhone muestra los pasos', () => {
    useAgent(IPHONE)
    render(
      <MemoryRouter>
        <InstallScreen />
      </MemoryRouter>,
    )
    expect(screen.getByText('Instalar en iPhone')).toBeInTheDocument()
    expect(
      screen.getByText(/abriste el enlace desde WhatsApp/),
    ).toBeInTheDocument()
  })
})
