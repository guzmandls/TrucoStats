import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getSession, saveSession } from '../../lib/session'
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
