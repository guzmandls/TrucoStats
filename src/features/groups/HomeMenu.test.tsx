import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearSession,
  getSession,
  markSessionExpired,
  saveSession,
} from '../../lib/session'
import { HomeScreen } from './HomeScreen'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('menú de la pantalla principal (cuenta)', () => {
  it('sin sesión el orden es registrarse, iniciar sesión y ver perfil, y no ofrece crear grupo', () => {
    renderHome()
    openMenu()

    const labels = within(screen.getByRole('banner'))
      .getAllByRole('link')
      .map((link) => link.textContent)
    // "Entrar" está siempre a la vista en la barra; después, las del menú.
    expect(labels).toEqual([
      'Entrar',
      'Registrarse',
      'Iniciar sesión',
      'Ver perfil',
      'Partidas rápidas',
    ])
    expect(screen.queryByText('Crear grupo')).not.toBeInTheDocument()
  })

  it('sin sesión la barra muestra "Entrar", que lleva a iniciar sesión', () => {
    renderHome()

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    )
  })

  it('con sesión la barra muestra tu foto, que abre el perfil', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()

    expect(
      screen.getByRole('link', { name: 'Perfil de juan' }),
    ).toHaveAttribute('href', '/perfil')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('una cuenta invitada de antes no cuenta como sesión: muestra "Entrar"', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'g1', username: null, email: null, name: 'Invitado' },
    })
    renderHome()

    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('con sesión el menú empieza con el usuario (que abre el perfil), y sigue con crear grupo y cerrar sesión', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()
    openMenu()

    const labels = within(screen.getByRole('navigation'))
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(['juan', 'Crear grupo', 'Partidas rápidas'])
    expect(
      within(screen.getByRole('navigation')).getByRole('link', {
        name: 'juan',
      }),
    ).toHaveAttribute('href', '/perfil')
    expect(screen.queryByText('Ver perfil')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Registrarse')).not.toBeInTheDocument()
  })

  it('una cuenta invitada abre su perfil desde la primera línea del menú, sin "Ver perfil" aparte', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u2', username: null, email: null, name: 'Pedro' },
    })
    renderHome()
    openMenu()

    const nav = within(screen.getByRole('navigation'))
    expect(nav.getByRole('link', { name: 'Invitado' })).toHaveAttribute(
      'href',
      '/perfil',
    )
    expect(nav.queryByText('Ver perfil')).toBeNull()
    expect(nav.getByRole('link', { name: 'Registrarse' })).toBeInTheDocument()
  })

  it('una cuenta invitada tampoco ve crear grupo', () => {
    saveSession({
      token: 'b'.repeat(64),
      user: { id: 'u2', username: null, email: null, name: 'Pedro' },
    })
    renderHome()
    openMenu()

    expect(screen.queryByText('Crear grupo')).not.toBeInTheDocument()
  })

  it('sin sesión ofrece registrarse e iniciar sesión', () => {
    renderHome()
    openMenu()

    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/registrarse',
    )
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion')
    expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument()
  })

  it('con una cuenta invitada también ofrece registrarse', () => {
    saveSession({
      token: 'b'.repeat(64),
      user: { id: 'u2', username: null, email: null, name: 'Pedro' },
    })
    renderHome()
    openMenu()

    expect(
      screen.getByRole('link', { name: 'Registrarse' }),
    ).toBeInTheDocument()
  })

  it('con sesión ofrece cerrarla y la cierra aunque no haya conexión', async () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )
    renderHome()
    openMenu()

    expect(
      screen.queryByRole('link', { name: 'Registrarse' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(getSession()).toBeNull())
  })
})

describe('usuario y sesión vencida en la pantalla principal', () => {
  it('el menú muestra con qué usuario se inició sesión', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()
    openMenu()

    expect(
      within(screen.getByRole('navigation')).getByText('juan'),
    ).toBeVisible()
  })

  it('una cuenta invitada se muestra como Invitado', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u2', username: null, email: null, name: 'Pedro' },
    })
    renderHome()
    openMenu()

    expect(
      within(screen.getByRole('navigation')).getByText('Invitado'),
    ).toBeVisible()
  })

  it('sin sesión el menú no muestra usuario', () => {
    renderHome()
    openMenu()

    expect(
      within(screen.getByRole('navigation')).queryByText('Invitado'),
    ).toBeNull()
  })

  it('avisa y ofrece iniciar sesión cuando la sesión venció', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    markSessionExpired()
    renderHome()

    expect(
      screen.getByText(
        'Tu sesión venció. Inicia sesión para enviar tus partidas.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/iniciar-sesion')
  })

  it('no avisa si la sesión está vigente', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()

    expect(screen.queryByText(/Tu sesión venció/)).toBeNull()
  })
})
