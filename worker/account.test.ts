// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env

function post(path: string, body: unknown, token?: string): Promise<Response> {
  return request(
    env,
    path,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    token,
  )
}

async function login(password: string): Promise<string | null> {
  const response = await post('/api/sesion', { identifier: 'juan', password })
  return response.ok
    ? ((await response.json()) as { token: string }).token
    : null
}

beforeEach(() => {
  env = { DB: createTestDb() }
})

describe('POST /api/contrasena', () => {
  it('cambia la contraseña, mantiene esta sesión y cierra las demás', async () => {
    const here = await registerTestUser(env, 'juan')
    const other = (await login('contraseña-segura'))!

    const response = await post(
      '/api/contrasena',
      { current: 'contraseña-segura', password: 'otra-contraseña' },
      here,
    )

    expect(response.status).toBe(200)
    expect(await login('otra-contraseña')).not.toBeNull()
    expect(await login('contraseña-segura')).toBeNull()
    const me = (token: string) =>
      request(env, '/api/yo', { method: 'GET' }, token)
    expect((await me(here)).status).toBe(200)
    expect((await me(other)).status).toBe(401)
  })

  it('con la contraseña actual equivocada no cambia nada', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await post(
      '/api/contrasena',
      { current: 'equivocada', password: 'otra-contraseña' },
      token,
    )

    expect(response.status).toBe(403)
    expect(await login('contraseña-segura')).not.toBeNull()
  })

  it('rechaza una contraseña nueva corta', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await post(
      '/api/contrasena',
      { current: 'contraseña-segura', password: 'corta' },
      token,
    )

    expect(response.status).toBe(400)
  })

  it('sin cuenta registrada responde 401', async () => {
    const response = await post('/api/contrasena', {
      current: 'x',
      password: 'otra-contraseña',
    })
    expect(response.status).toBe(401)
  })
})
