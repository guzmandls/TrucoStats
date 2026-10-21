import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getSession } from '../../lib/session'
import { AuthScreen } from './AuthScreen'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderAuth(mode: 'register' | 'login', from?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: mode === 'register' ? '/registrarse' : '/iniciar-sesion',
          state: from ? { from } : null,
        },
      ]}
    >
      <Routes>
        <Route path="/registrarse" element={<AuthScreen mode="register" />} />
        <Route path="/iniciar-sesion" element={<AuthScreen mode="login" />} />
        <Route path="/" element={<LocationProbe />} />
        <Route path="/crear-grupo" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const session = {
  token: 'a'.repeat(64),
  user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
}

function stubServer(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) {
      throw response
    }
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('AuthScreen (registrarse)', () => {
  it('pide usuario, contraseña y un correo opcional que explica para qué sirve', () => {
    renderAuth('register')

    expect(screen.getByLabelText('Usuario')).toBeRequired()
    expect(screen.getByLabelText('Contraseña')).toBeRequired()
    expect(screen.getByLabelText('Correo (opcional)')).not.toBeRequired()
    expect(
      screen.getByText('Sirve para poder recuperar tu contraseña.'),
    ).toBeInTheDocument()
  })

  it('crea la cuenta, guarda la sesión y vuelve a donde estaba', async () => {
    const fetchMock = stubServer(json(session, 201))
    renderAuth('register', '/crear-grupo')

    fill('Usuario', 'juan')
    fill('Contraseña', 'contraseña-segura')
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/crear-grupo'),
    )
    expect(getSession()).toEqual(session)
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/registro')
    expect(JSON.parse(init.body as string)).toEqual({
      username: 'juan',
      password: 'contraseña-segura',
    })
  })

  it('envía el correo si se escribió', async () => {
    const fetchMock = stubServer(json(session, 201))
    renderAuth('register')

    fill('Usuario', 'juan')
    fill('Contraseña', 'contraseña-segura')
    fill('Correo (opcional)', 'juan@correo.com')
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).email).toBe('juan@correo.com')
  })

  it('muestra el aviso del servidor y no guarda sesión', async () => {
    stubServer(json({ error: 'Ese usuario ya existe' }, 409))
    renderAuth('register')

    fill('Usuario', 'juan')
    fill('Contraseña', 'contraseña-segura')
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese usuario ya existe',
    )
    expect(getSession()).toBeNull()
  })

  it('avisa que hace falta conexión', async () => {
    stubServer(new TypeError('sin red'))
    renderAuth('register')

    fill('Usuario', 'juan')
    fill('Contraseña', 'contraseña-segura')
    fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Necesitas conexión a Internet',
    )
  })

  it('lleva a iniciar sesión si ya tiene cuenta', () => {
    renderAuth('register')

    fireEvent.click(screen.getByRole('link', { name: 'Iniciar sesión' }))

    expect(screen.getByLabelText('Usuario o correo')).toBeInTheDocument()
  })
})

describe('AuthScreen (iniciar sesión)', () => {
  it('entra con el usuario o el correo y guarda la sesión', async () => {
    const fetchMock = stubServer(json(session))
    renderAuth('login')

    fill('Usuario o correo', 'juan')
    fill('Contraseña', 'contraseña-segura')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/'),
    )
    expect(getSession()).toEqual(session)
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/sesion')
    expect(JSON.parse(init.body as string)).toEqual({
      identifier: 'juan',
      password: 'contraseña-segura',
    })
  })

  it('no pide correo y muestra el error de credenciales', async () => {
    stubServer(json({ error: 'Usuario o contraseña incorrectos' }, 401))
    renderAuth('login')

    expect(screen.queryByLabelText('Correo (opcional)')).not.toBeInTheDocument()
    fill('Usuario o correo', 'juan')
    fill('Contraseña', 'mal')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos',
    )
  })
})
