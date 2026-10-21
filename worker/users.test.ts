// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import worker from './index'
import type { Env } from './groups'
import { createTestDb } from './testDb'

let env: Env

function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://trucostats.test${path}`, init), env)
}

function send(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  return call(path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const account = {
  email: 'Juan@Correo.com',
  password: 'contraseña-segura',
  name: 'Juan',
}

async function registerJuan(): Promise<string> {
  const response = await send('POST', '/api/registro', account)
  return ((await response.json()) as { token: string }).token
}

beforeEach(() => {
  env = { DB: createTestDb() }
})

describe('POST /api/registro', () => {
  it('crea la cuenta y abre la sesión', async () => {
    const response = await send('POST', '/api/registro', account)

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      token: string
      user: { id: string; email: string; name: string }
    }
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user).toMatchObject({ email: 'juan@correo.com', name: 'Juan' })
  })

  it('no guarda la contraseña ni el token tal cual', async () => {
    const token = await registerJuan()

    const user = await env.DB.prepare('SELECT * FROM users').first<
      Record<string, string>
    >()
    expect(JSON.stringify(user)).not.toContain(account.password)
    const session = await env.DB.prepare('SELECT * FROM sessions').first<
      Record<string, string>
    >()
    expect(JSON.stringify(session)).not.toContain(token)
  })

  it('rechaza un correo repetido sin importar mayúsculas', async () => {
    await registerJuan()
    const response = await send('POST', '/api/registro', {
      ...account,
      email: 'JUAN@correo.COM',
    })

    expect(response.status).toBe(409)
  })

  it.each([
    ['correo inválido', { email: 'juan' }],
    ['contraseña corta', { password: '1234567' }],
    ['sin nombre', { name: '   ' }],
    ['nombre largo', { name: 'x'.repeat(21) }],
  ])('rechaza datos inválidos (%s)', async (_caso, cambio) => {
    const response = await send('POST', '/api/registro', {
      ...account,
      ...cambio,
    })

    expect(response.status).toBe(400)
  })

  it('rechaza un JSON inválido y un método incorrecto', async () => {
    const invalid = await call('/api/registro', {
      method: 'POST',
      body: 'no es json',
    })
    expect(invalid.status).toBe(400)
    expect((await call('/api/registro')).status).toBe(405)
  })
})

describe('POST /api/sesion', () => {
  beforeEach(async () => {
    await registerJuan()
  })

  it('inicia sesión con el correo y la contraseña', async () => {
    const response = await send('POST', '/api/sesion', {
      email: ' juan@correo.com ',
      password: account.password,
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string }
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rechaza una contraseña incorrecta y un correo desconocido igual', async () => {
    const wrongPassword = await send('POST', '/api/sesion', {
      email: account.email,
      password: 'otra-contraseña',
    })
    const unknown = await send('POST', '/api/sesion', {
      email: 'nadie@correo.com',
      password: account.password,
    })

    expect(wrongPassword.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(await wrongPassword.json()).toEqual(await unknown.json())
  })
})

describe('GET /api/yo', () => {
  it('devuelve la cuenta de la sesión', async () => {
    const token = await registerJuan()
    const response = await send('GET', '/api/yo', undefined, token)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      user: { email: 'juan@correo.com', name: 'Juan' },
    })
  })

  it('responde 401 sin sesión o con un token falso', async () => {
    expect((await send('GET', '/api/yo')).status).toBe(401)
    expect(
      (await send('GET', '/api/yo', undefined, 'a'.repeat(64))).status,
    ).toBe(401)
  })

  it('responde 401 con una sesión vencida', async () => {
    const token = await registerJuan()
    await env.DB.prepare('UPDATE sessions SET expires_at = ?')
      .bind('2020-01-01T00:00:00.000Z')
      .run()

    expect((await send('GET', '/api/yo', undefined, token)).status).toBe(401)
  })
})

describe('DELETE /api/sesion', () => {
  it('cierra la sesión: el token deja de servir', async () => {
    const token = await registerJuan()

    const response = await send('DELETE', '/api/sesion', undefined, token)

    expect(response.status).toBe(200)
    expect((await send('GET', '/api/yo', undefined, token)).status).toBe(401)
  })
})
