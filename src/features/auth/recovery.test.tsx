import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getSession, saveSession } from '../../lib/session'
import { DeleteAccount } from '../profile/DeleteAccount'
import { EmailSection } from '../profile/EmailSection'
import { PasswordSection } from '../profile/PasswordSection'
import { AuthScreen } from './AuthScreen'
import { ConfirmEmailScreen } from './ConfirmEmailScreen'
import { ForgotPasswordScreen } from './ForgotPasswordScreen'
import { ResetPasswordScreen } from './ResetPasswordScreen'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderAt(path: string, ui: React.ReactNode, route: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={ui} />
        <Route path="/" element={<LocationProbe />} />
        <Route path="/recuperar" element={<div>pedir enlace</div>} />
        <Route path="/iniciar-sesion" element={<div>iniciar sesión</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

interface Call {
  url: string
  body: Record<string, unknown>
}

function stubServer(responder: (call: Call) => Response) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call: Call = {
        url,
        body: init.body
          ? (JSON.parse(init.body as string) as Call['body'])
          : {},
      }
      calls.push(call)
      return responder(call)
    }),
  )
  return calls
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const TOKEN = 'a'.repeat(64)
const account = {
  token: 'b'.repeat(64),
  user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('iniciar sesión', () => {
  it('ofrece recuperar la contraseña, pero no al registrarse', () => {
    const login = render(
      <MemoryRouter>
        <AuthScreen mode="login" />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }),
    ).toHaveAttribute('href', '/recuperar')
    login.unmount()

    render(
      <MemoryRouter>
        <AuthScreen mode="register" />
      </MemoryRouter>,
    )
    expect(screen.queryByText('¿Olvidaste tu contraseña?')).toBeNull()
  })
})

describe('ForgotPasswordScreen', () => {
  it('pide el enlace y avisa sin revelar si la cuenta existe', async () => {
    const calls = stubServer(() => json({ ok: true }))
    renderAt('/recuperar', <ForgotPasswordScreen />, '/recuperar')

    fill('Usuario o correo', 'juan')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    expect(
      screen.getByText(/Si existe una cuenta con ese usuario o correo/),
    ).toBeInTheDocument()
    expect(calls).toEqual([
      { url: '/api/recuperar', body: { identifier: 'juan' } },
    ])
    fireEvent.click(
      screen.getByRole('button', { name: 'Volver a iniciar sesión' }),
    )
    expect(await screen.findByText('iniciar sesión')).toBeInTheDocument()
  })

  it('avisa si no hay conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('sin red')
      }),
    )
    renderAt('/recuperar', <ForgotPasswordScreen />, '/recuperar')

    fill('Usuario o correo', 'juan')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Necesitas conexión a Internet',
    )
  })
})

describe('ResetPasswordScreen', () => {
  const path = `/restablecer/${TOKEN}`
  const route = '/restablecer/:token'

  it('guarda la contraseña nueva, deja la sesión iniciada y vuelve al inicio', async () => {
    const calls = stubServer((call) =>
      call.url === '/api/restablecer'
        ? json(account)
        : json({ inviteCodes: [] }),
    )
    renderAt(path, <ResetPasswordScreen />, route)

    fill('Contraseña nueva', 'una-contraseña-nueva')
    fill('Repetir contraseña', 'una-contraseña-nueva')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/')
    expect(calls[0]).toEqual({
      url: '/api/restablecer',
      body: { token: TOKEN, password: 'una-contraseña-nueva' },
    })
    expect(getSession()?.user.username).toBe('juan')
  })

  it('no manda nada si las contraseñas no coinciden', () => {
    const calls = stubServer(() => json(account))
    renderAt(path, <ResetPasswordScreen />, route)

    fill('Contraseña nueva', 'una-contraseña-nueva')
    fill('Repetir contraseña', 'otra-contraseña-distinta')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(screen.getByRole('alert')).toHaveTextContent('no coinciden')
    expect(calls).toEqual([])
    expect(getSession()).toBeNull()
  })

  it('si el enlace venció, lo dice y ofrece pedir otro', async () => {
    stubServer(() => json({ error: 'El enlace no es válido o ya venció' }, 400))
    renderAt(path, <ResetPasswordScreen />, route)

    fill('Contraseña nueva', 'una-contraseña-nueva')
    fill('Repetir contraseña', 'una-contraseña-nueva')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ya venció')
    fireEvent.click(screen.getByRole('button', { name: 'Pedir otro enlace' }))
    expect(await screen.findByText('pedir enlace')).toBeInTheDocument()
  })

  it('si la contraseña es corta, no ofrece pedir otro enlace (el enlace sigue sirviendo)', async () => {
    stubServer(() =>
      json({ error: 'La contraseña debe tener entre 8 y 100 caracteres' }, 400),
    )
    renderAt(path, <ResetPasswordScreen />, route)

    fill('Contraseña nueva', 'corta')
    fill('Repetir contraseña', 'corta')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('8 y 100')
    expect(
      screen.queryByRole('button', { name: 'Pedir otro enlace' }),
    ).toBeNull()
  })
})

describe('ConfirmEmailScreen', () => {
  const path = `/confirmar-correo/${TOKEN}`
  const route = '/confirmar-correo/:token'

  it('confirma el correo una sola vez y actualiza la cuenta de este celular', async () => {
    saveSession(account)
    const calls = stubServer(() =>
      json({ ok: true, email: 'juan@ejemplo.com', userId: 'u1' }),
    )
    renderAt(path, <ConfirmEmailScreen />, route)

    expect(await screen.findByText('Correo confirmado')).toBeInTheDocument()
    expect(screen.getByText('juan@ejemplo.com')).toBeInTheDocument()
    expect(calls).toEqual([
      { url: '/api/correo/confirmar', body: { token: TOKEN } },
    ])
    expect(getSession()?.user.email).toBe('juan@ejemplo.com')
  })

  it('no toca la sesión si el correo es de otra cuenta', async () => {
    saveSession(account)
    stubServer(() =>
      json({ ok: true, email: 'otra@ejemplo.com', userId: 'u2' }),
    )
    renderAt(path, <ConfirmEmailScreen />, route)

    await screen.findByText('Correo confirmado')

    expect(getSession()?.user.email).toBeNull()
  })

  it('si el enlace no sirve, lo dice', async () => {
    stubServer(() => json({ error: 'El enlace no es válido o ya venció' }, 400))
    renderAt(path, <ConfirmEmailScreen />, route)

    expect(await screen.findByRole('alert')).toHaveTextContent('ya venció')
  })
})

describe('EmailSection (perfil)', () => {
  it('no aparece sin una cuenta registrada', () => {
    saveSession({
      token: 'c'.repeat(64),
      user: { id: 'g1', username: null, email: null, name: 'Invitado' },
    })
    render(<EmailSection />)

    expect(screen.queryByText('Correo')).toBeNull()
  })

  it('sin correo explica para qué sirve y manda el enlace de confirmación', async () => {
    saveSession(account)
    const calls = stubServer(() =>
      json({ ok: true, email: 'juan@ejemplo.com' }),
    )
    render(<EmailSection />)

    expect(screen.getByText(/No tienes un correo guardado/)).toBeInTheDocument()
    const send = screen.getByRole('button', {
      name: 'Enviar enlace de confirmación',
    })
    expect(send).toBeDisabled()
    fill('Correo', 'juan@ejemplo.com')
    fireEvent.click(send)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Te enviamos un enlace a juan@ejemplo.com',
    )
    expect(calls.filter((call) => call.url === '/api/correo')).toEqual([
      { url: '/api/correo', body: { email: 'juan@ejemplo.com' } },
    ])
    // Hasta confirmar, el correo de la cuenta no cambia.
    expect(getSession()?.user.email).toBeNull()
  })

  it('si el correo se confirmó desde otro navegador, el perfil lo muestra al abrirse', async () => {
    saveSession(account)
    stubServer((call) =>
      call.url === '/api/yo'
        ? json({ user: { ...account.user, email: 'juan@ejemplo.com' } })
        : json({ ok: true }),
    )
    render(<EmailSection />)

    expect(
      await screen.findByText('Tu correo: juan@ejemplo.com'),
    ).toBeInTheDocument()
    expect(getSession()?.user.email).toBe('juan@ejemplo.com')
  })

  it('con correo lo muestra y permite cambiarlo; muestra los errores del servidor', async () => {
    saveSession({
      ...account,
      user: { ...account.user, email: 'viejo@ejemplo.com' },
    })
    stubServer(() =>
      json({ error: 'Ya existe una cuenta con ese correo' }, 409),
    )
    render(<EmailSection />)

    expect(screen.getByText('Tu correo: viejo@ejemplo.com')).toBeInTheDocument()
    fill('Correo nuevo', 'ocupado@ejemplo.com')
    fireEvent.click(
      screen.getByRole('button', { name: 'Enviar enlace de confirmación' }),
    )

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Ya existe una cuenta',
      ),
    )
  })
})

describe('PasswordSection (perfil)', () => {
  function fillPasswords(current: string, next: string, repeat: string) {
    fill('Contraseña actual', current)
    fill('Contraseña nueva', next)
    fill('Repetir contraseña nueva', repeat)
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
  }

  it('no aparece sin una cuenta registrada', () => {
    saveSession({
      token: 'c'.repeat(64),
      user: { id: 'g1', username: null, email: null, name: 'Invitado' },
    })
    render(<PasswordSection />)
    expect(screen.queryByText('Contraseña')).toBeNull()
  })

  it('si las nuevas no coinciden, no manda nada', () => {
    saveSession(account)
    const calls = stubServer(() => json({ ok: true }))
    render(<PasswordSection />)

    fillPasswords('vieja-contraseña', 'una-nueva-1', 'una-nueva-2')

    expect(screen.getByRole('alert')).toHaveTextContent('no coinciden')
    expect(calls).toEqual([])
  })

  it('cambia la contraseña y avisa que se cerraron las demás sesiones', async () => {
    saveSession(account)
    const calls = stubServer(() => json({ ok: true }))
    render(<PasswordSection />)

    fillPasswords('vieja-contraseña', 'una-nueva-1', 'una-nueva-1')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se cerró la sesión en los demás celulares',
    )
    expect(calls).toEqual([
      {
        url: '/api/contrasena',
        body: { current: 'vieja-contraseña', password: 'una-nueva-1' },
      },
    ])
    expect(getSession()?.token).toBe(account.token)
  })

  it('muestra el error si la contraseña actual no es correcta', async () => {
    saveSession(account)
    stubServer(() =>
      json({ error: 'La contraseña actual no es correcta' }, 403),
    )
    render(<PasswordSection />)

    fillPasswords('equivocada', 'una-nueva-1', 'una-nueva-1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña actual no es correcta',
    )
    expect(getSession()).not.toBeNull()
  })
})

describe('DeleteAccount (perfil)', () => {
  function renderInProfile() {
    return renderAt('/perfil', <DeleteAccount />, '/perfil')
  }

  it('pide la contraseña, borra la cuenta y vuelve al inicio sin sesión', async () => {
    saveSession(account)
    const calls = stubServer(() => json({ ok: true }))
    renderInProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }))
    expect(
      await screen.findByRole('dialog', { name: '¿Eliminar tu cuenta?' }),
    ).toBeInTheDocument()
    fill('Contraseña', 'mi-contraseña')
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Eliminar cuenta',
      }),
    )

    expect(await screen.findByTestId('location')).toHaveTextContent('/')
    expect(calls).toEqual([
      { url: '/api/eliminar-cuenta', body: { password: 'mi-contraseña' } },
    ])
    expect(getSession()).toBeNull()
  })

  it('con la contraseña equivocada lo dice y no cierra la sesión', async () => {
    saveSession(account)
    stubServer(() => json({ error: 'La contraseña no es correcta' }, 403))
    renderInProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }))
    const dialog = await screen.findByRole('dialog')
    fill('Contraseña', 'equivocada')
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Eliminar cuenta',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña no es correcta',
    )
    expect(getSession()?.user.username).toBe('juan')
  })
})
