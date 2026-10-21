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
  it('sin sesión el orden es registrarse, iniciar sesión y ver perfil, y no ofrece crear grupo', () => {
    renderHome()
    openMenu()

    const labels = within(screen.getByRole('banner'))
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(['Registrarse', 'Iniciar sesión', 'Ver perfil'])
    expect(screen.queryByText('Crear grupo')).not.toBeInTheDocument()
  })

  it('con sesión el orden es crear grupo, ver perfil y cerrar sesión', () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()
    openMenu()

    const items = within(screen.getByRole('banner'))
      .getAllByText(/Crear grupo|Ver perfil|Cerrar sesión/)
      .map((item) => item.textContent)
    expect(items).toEqual(['Crear grupo', 'Ver perfil', 'Cerrar sesión'])
    expect(screen.queryByText('Registrarse')).not.toBeInTheDocument()
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
