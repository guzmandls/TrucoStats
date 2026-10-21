import worker from './index'
import type { Env } from './groups'

// Crea una cuenta con correo en el servidor de prueba y devuelve su token.
export async function registerTestUser(
  env: Env,
  email = 'admin@correo.com',
  name = 'Admin',
): Promise<string> {
  const response = await worker.fetch(
    new Request('https://trucostats.test/api/registro', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'contraseña-segura', name }),
    }),
    env,
  )
  return ((await response.json()) as { token: string }).token
}

// Hace un pedido al servidor de prueba, con sesión si se pasa un token.
export function request(
  env: Env,
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`)
  }
  return worker.fetch(
    new Request(`https://trucostats.test${path}`, { ...init, headers }),
    env,
  )
}
