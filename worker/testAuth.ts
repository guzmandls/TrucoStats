import worker from './index'
import type { Env } from './groups'

// Crea una cuenta registrada en el servidor de prueba y devuelve su token.
export async function registerTestUser(
  env: Env,
  username = 'admin',
): Promise<string> {
  const response = await worker.fetch(
    new Request('https://trucostats.test/api/registro', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password: 'contraseña-segura' }),
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

let people = 0

// Una persona nueva, con cuenta registrada, elige el integrante `memberId` del
// grupo. Devuelve su token.
export async function joinWithNewAccount(
  env: Env,
  code: string,
  memberId: string,
  username = `persona${(people += 1)}`,
): Promise<string> {
  const token = await registerTestUser(env, username)
  await request(
    env,
    `/api/grupos/${code}/unirse`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memberId }),
    },
    token,
  )
  return token
}
