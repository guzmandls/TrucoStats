// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env

function send(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  return request(
    env,
    path,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    token,
  )
}

const account = {
  username: 'Juan_23',
  password: 'contraseña-segura',
  email: 'Juan@Correo.com',
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
      user: { id: string; username: string; email: string; name: string }
    }
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user).toMatchObject({
      username: 'juan_23',
      email: 'juan@correo.com',
      name: 'juan_23',
    })
  })

  it('el correo es opcional', async () => {
    const response = await send('POST', '/api/registro', {
      username: 'sin_correo',
      password: account.password,
    })

    expect(response.status).toBe(201)
    expect(
      ((await response.json()) as { user: { email: null } }).user.email,
    ).toBe(null)
  })

  it('acepta un correo vacío como "sin correo"', async () => {
    const response = await send('POST', '/api/registro', {
      ...account,
      email: '  ',
    })

    expect(response.status).toBe(201)
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

  it('rechaza un usuario repetido sin importar mayúsculas', async () => {
    await registerJuan()
    const response = await send('POST', '/api/registro', {
      username: 'JUAN_23',
      password: account.password,
    })

    expect(response.status).toBe(409)
  })

  it('rechaza un correo repetido', async () => {
    await registerJuan()
    const response = await send('POST', '/api/registro', {
      username: 'otro',
      password: account.password,
      email: 'JUAN@correo.com',
    })

    expect(response.status).toBe(409)
  })

  it.each([
    ['usuario vacío', { username: '' }],
    ['usuario con espacios', { username: 'juan perez' }],
    ['usuario largo', { username: 'x'.repeat(21) }],
    ['correo inválido', { email: 'juan' }],
    ['contraseña corta', { password: '1234567' }],
  ])('rechaza datos inválidos (%s)', async (_caso, cambio) => {
    const response = await send('POST', '/api/registro', {
      ...account,
      ...cambio,
    })

    expect(response.status).toBe(400)
  })

  it.each(['a', 'ab'])(
    'permite un usuario de 1 o 2 caracteres (%s)',
    async (username) => {
      const response = await send('POST', '/api/registro', {
        ...account,
        username,
        email: undefined,
      })

      expect(response.status).toBe(201)
    },
  )

  it('rechaza un JSON inválido y un método incorrecto', async () => {
    const invalid = await request(env, '/api/registro', {
      method: 'POST',
      body: 'no es json',
    })
    expect(invalid.status).toBe(400)
    expect((await request(env, '/api/registro')).status).toBe(405)
  })
})

describe('POST /api/sesion', () => {
  beforeEach(async () => {
    await registerJuan()
  })

  it('inicia sesión con el usuario', async () => {
    const response = await send('POST', '/api/sesion', {
      identifier: ' JUAN_23 ',
      password: account.password,
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string }
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('inicia sesión con el correo', async () => {
    const response = await send('POST', '/api/sesion', {
      identifier: 'juan@correo.com',
      password: account.password,
    })

    expect(response.status).toBe(200)
  })

  it('rechaza una contraseña incorrecta y un usuario desconocido igual', async () => {
    const wrongPassword = await send('POST', '/api/sesion', {
      identifier: 'juan_23',
      password: 'otra-contraseña',
    })
    const unknown = await send('POST', '/api/sesion', {
      identifier: 'nadie',
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
      user: { username: 'juan_23', email: 'juan@correo.com' },
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
