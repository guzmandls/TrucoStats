import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InviteDialog } from './InviteDialog'

const group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [{ id: 'm1', name: 'Juan' }],
  inviteCode: 'abc123',
}

const link = `${window.location.origin}/unirse/abc123`

function renderDialog(onClose = vi.fn()) {
  render(<InviteDialog group={group} onClose={onClose} />)
  return onClose
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    configurable: true,
  })
})

describe('InviteDialog', () => {
  it('muestra el enlace de invitación', () => {
    renderDialog()

    expect(screen.getByLabelText('Enlace de invitación')).toHaveValue(link)
  })

  it('copia el enlace al portapapeles y lo avisa', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))

    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(link)
  })

  it('avisa si no se pudo copiar', async () => {
    const writeText = vi.fn(async () => Promise.reject(new Error('denegado')))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))

    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument()
  })

  it('ofrece compartir solo si el navegador lo permite', () => {
    renderDialog()
    expect(
      screen.queryByRole('button', { name: 'Compartir' }),
    ).not.toBeInTheDocument()
  })

  it('comparte el enlace con el menú del sistema', async () => {
    const share = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    })
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Compartir' }))

    expect(share).toHaveBeenCalledWith({
      title: 'Únete a Los pibes en TrucoStats',
      url: link,
    })
  })

  it('se cierra con el botón Cerrar y con Escape', () => {
    const onClose = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
