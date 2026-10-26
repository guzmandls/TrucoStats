// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
const PASSWORD = 'contraseña-segura'

function send(
  path: string,
  body: unknown,
  { token, ip }: { token?: string; ip?: string } = {},
) {
  return request(
    env,
    path,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ip ? { 'cf-connecting-ip': ip } : {}),
      },
      body: JSON.stringify(body),
    },
    token,
  )
}

function login(identifier: string, password: string, ip?: string) {
  return send('/api/sesion', { identifier, password }, { ip })
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  await registerTestUser(env, 'juan')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('límite de intentos de contraseña', () => {
  it('tras 10 contraseñas incorrectas bloquea el usuario, aunque después acierte', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await login('juan', 'incorrecta')).status).toBe(401)
    }
    const blocked = await login('juan', PASSWORD)
    expect(blocked.status).toBe(429)
    expect(((await blocked.json()) as { error: string }).error).toBe(
      'Demasiados intentos. Inténtalo de nuevo en 15 minutos.',
    )
    // Escribirlo con otras mayúsculas no esquiva el bloqueo.
    expect((await login('JUAN', PASSWORD)).status).toBe(429)
  })

  it('pasado el bloqueo se puede entrar de nuevo', async () => {
    for (let i = 0; i < 10; i += 1) {
      await login('juan', 'incorrecta')
    }
    vi.useFakeTimers({ now: Date.now() + 16 * 60 * 1000 })
    expect((await login('juan', PASSWORD)).status).toBe(200)
  })

  it('acertar reinicia la cuenta de fallos', async () => {
    for (let i = 0; i < 9; i += 1) {
      await login('juan', 'incorrecta')
    }
    expect((await login('juan', PASSWORD)).status).toBe(200)
    for (let i = 0; i < 9; i += 1) {
      await login('juan', 'incorrecta')
    }
    expect((await login('juan', PASSWORD)).status).toBe(200)
  })

  it('bloquea una IP que prueba contraseñas de muchos usuarios', async () => {
    for (let i = 0; i < 30; i += 1) {
      await login(`usuario${i}`, 'incorrecta', '203.0.113.7')
    }
    expect((await login('juan', PASSWORD, '203.0.113.7')).status).toBe(429)
    // Desde otra IP, Juan entra sin problema.
    expect((await login('juan', PASSWORD, '198.51.100.2')).status).toBe(200)
  })

  it('también limita la contraseña al cambiarla y al eliminar la cuenta', async () => {
    const token = await registerTestUser(env, 'pedro')
    for (let i = 0; i < 10; i += 1) {
      expect(
        (
          await send(
            '/api/contrasena',
            { current: 'incorrecta', password: 'otra-contraseña' },
            { token },
          )
        ).status,
      ).toBe(403)
    }
    expect(
      (await send('/api/eliminar-cuenta', { password: PASSWORD }, { token }))
        .status,
    ).toBe(429)
  })
})

describe('límite de cuentas nuevas', () => {
  it('desde una misma IP, como máximo 10 por hora', async () => {
    for (let i = 0; i < 10; i += 1) {
      const response = await send(
        '/api/registro',
        { username: `nuevo${i}`, password: PASSWORD },
        { ip: '203.0.113.9' },
      )
      expect(response.status).toBe(201)
    }
    const blocked = await send(
      '/api/registro',
      { username: 'nuevo10', password: PASSWORD },
      { ip: '203.0.113.9' },
    )
    expect(blocked.status).toBe(429)
    // Otra conexión sí puede.
    expect(
      (
        await send(
          '/api/registro',
          { username: 'nuevo11', password: PASSWORD },
          { ip: '198.51.100.3' },
        )
      ).status,
    ).toBe(201)
  })
})
