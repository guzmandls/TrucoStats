// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from './groups'
import { request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let sent: { url: string; headers: Record<string, string>; body: MailBody }[]

interface MailBody {
  sender: { name: string; email: string }
  to: { email: string }[]
  subject: string
  textContent: string
  htmlContent: string
}

function post(path: string, body: unknown, token?: string) {
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

async function register(username: string, email?: string) {
  const response = await post('/api/registro', {
    username,
    password: 'contraseña-segura',
    ...(email ? { email } : {}),
  })
  return ((await response.json()) as { token: string }).token
}

async function login(identifier: string, password: string) {
  return post('/api/sesion', { identifier, password })
}

// El token del último correo enviado (el que va en el enlace).
function lastToken(): string {
  const text = sent[sent.length - 1].body.textContent
  return /\/([0-9a-f]{64})/.exec(text)![1]
}

beforeEach(() => {
  env = {
    DB: createTestDb(),
    BREVO_API_KEY: 'clave-de-prueba',
    MAIL_FROM: 'remitente@ejemplo.com',
    APP_URL: 'https://app.ejemplo.com/',
  }
  sent = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({
        url,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(init.body as string) as MailBody,
      })
      return new Response('{}', { status: 201 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/recuperar', () => {
  it('manda a la cuenta un correo con un enlace a la app', async () => {
    await register('juan', 'juan@ejemplo.com')

    const response = await post('/api/recuperar', { identifier: 'juan' })

    expect(response.status).toBe(200)
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(sent[0].headers['api-key']).toBe('clave-de-prueba')
    expect(sent[0].body.sender.email).toBe('remitente@ejemplo.com')
    expect(sent[0].body.to).toEqual([{ email: 'juan@ejemplo.com' }])
    expect(sent[0].body.subject).toBe('Recupera tu contraseña de TrucoStats')
    expect(sent[0].body.textContent).toContain(
      'https://app.ejemplo.com/restablecer/',
    )
  })

  it('también se puede pedir con el correo', async () => {
    await register('juan', 'juan@ejemplo.com')

    await post('/api/recuperar', { identifier: 'Juan@Ejemplo.com' })

    expect(sent).toHaveLength(1)
  })

  it('responde lo mismo si la cuenta no existe o no tiene correo, sin mandar nada', async () => {
    await register('sincorreo')

    const unknown = await post('/api/recuperar', { identifier: 'nadie' })
    const noEmail = await post('/api/recuperar', { identifier: 'sincorreo' })

    expect(unknown.status).toBe(200)
    expect(noEmail.status).toBe(200)
    expect(await unknown.json()).toEqual(await noEmail.json())
    expect(sent).toEqual([])
  })

  it('el enlace usa la dirección de la app, no la que mande quien pide', async () => {
    await register('juan', 'juan@ejemplo.com')

    await request(env, '/api/recuperar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://sitio-malicioso.com',
        host: 'sitio-malicioso.com',
      },
      body: JSON.stringify({ identifier: 'juan' }),
    })

    expect(sent[0].body.textContent).not.toContain('malicioso')
  })

  it('limita cuántos correos se pueden pedir por hora', async () => {
    await register('juan', 'juan@ejemplo.com')

    for (let i = 0; i < 6; i += 1) {
      await post('/api/recuperar', { identifier: 'juan' })
    }

    expect(sent).toHaveLength(3)
  })

  it('si el correo no sale, no queda un enlace válido guardado', async () => {
    await register('juan', 'juan@ejemplo.com')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 })),
    )

    const response = await post('/api/recuperar', { identifier: 'juan' })

    expect(response.status).toBe(200)
    const left = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM email_tokens',
    ).first<{ total: number }>()
    expect(left?.total).toBe(0)
  })

  it('pide escribir el usuario o el correo', async () => {
    expect((await post('/api/recuperar', { identifier: '  ' })).status).toBe(
      400,
    )
  })
})

describe('POST /api/restablecer', () => {
  async function requestToken() {
    await register('juan', 'juan@ejemplo.com')
    await post('/api/recuperar', { identifier: 'juan' })
    return lastToken()
  }

  it('cambia la contraseña, deja iniciada una sesión nueva y cierra las demás', async () => {
    const oldSession = await register('ana', 'ana@ejemplo.com')
    await post('/api/recuperar', { identifier: 'ana' })

    const response = await post('/api/restablecer', {
      token: lastToken(),
      password: 'una-contraseña-nueva',
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      token: string
      user: { username: string }
    }
    expect(body.user.username).toBe('ana')
    expect((await login('ana', 'una-contraseña-nueva')).status).toBe(200)
    expect((await login('ana', 'contraseña-segura')).status).toBe(401)
    // La sesión vieja ya no sirve y la nueva sí.
    expect(
      (await request(env, '/api/yo', { method: 'GET' }, oldSession)).status,
    ).toBe(401)
    expect(
      (await request(env, '/api/yo', { method: 'GET' }, body.token)).status,
    ).toBe(200)
  })

  it('el enlace se puede usar una sola vez', async () => {
    const token = await requestToken()
    const first = await post('/api/restablecer', {
      token,
      password: 'una-contraseña-nueva',
    })
    const second = await post('/api/restablecer', {
      token,
      password: 'otra-contraseña-distinta',
    })

    expect(first.status).toBe(200)
    expect(second.status).toBe(400)
    expect((await login('juan', 'una-contraseña-nueva')).status).toBe(200)
  })

  it('rechaza un enlace vencido', async () => {
    const token = await requestToken()
    await env.DB.prepare('UPDATE email_tokens SET expires_at = ?')
      .bind(new Date(Date.now() - 1000).toISOString())
      .run()

    const response = await post('/api/restablecer', {
      token,
      password: 'una-contraseña-nueva',
    })

    expect(response.status).toBe(400)
    expect((await login('juan', 'contraseña-segura')).status).toBe(200)
  })

  it('dura una hora', async () => {
    await requestToken()
    const row = await env.DB.prepare(
      'SELECT created_at, expires_at FROM email_tokens',
    ).first<{ created_at: string; expires_at: string }>()

    const minutes =
      (Date.parse(row!.expires_at) - Date.parse(row!.created_at)) / 60000
    expect(Math.round(minutes)).toBe(60)
  })

  it('rechaza un enlace inventado o una contraseña corta', async () => {
    const token = await requestToken()

    expect(
      (
        await post('/api/restablecer', {
          token: 'a'.repeat(64),
          password: 'una-contraseña-nueva',
        })
      ).status,
    ).toBe(400)
    expect(
      (await post('/api/restablecer', { token: 'x', password: 'larga-larga' }))
        .status,
    ).toBe(400)
    expect(
      (await post('/api/restablecer', { token, password: 'corta' })).status,
    ).toBe(400)
    // La contraseña corta no gastó el enlace.
    expect(
      (
        await post('/api/restablecer', {
          token,
          password: 'suficientemente-larga',
        })
      ).status,
    ).toBe(200)
  })

  it('un enlace de confirmar correo no sirve para cambiar la contraseña', async () => {
    const session = await register('juan', 'juan@ejemplo.com')
    await post('/api/correo', { email: 'nuevo@ejemplo.com' }, session)

    const response = await post('/api/restablecer', {
      token: lastToken(),
      password: 'una-contraseña-nueva',
    })

    expect(response.status).toBe(400)
  })
})

describe('correo de la cuenta', () => {
  it('guarda el correo nuevo solo cuando se abre el enlace de confirmación', async () => {
    const session = await register('juan')

    const response = await post(
      '/api/correo',
      { email: 'Juan@Ejemplo.com' },
      session,
    )

    expect(response.status).toBe(200)
    expect(sent).toHaveLength(1)
    expect(sent[0].body.to).toEqual([{ email: 'juan@ejemplo.com' }])
    expect(sent[0].body.textContent).toContain(
      'https://app.ejemplo.com/confirmar-correo/',
    )
    const before = await request(env, '/api/yo', { method: 'GET' }, session)
    expect(
      ((await before.json()) as { user: { email: string | null } }).user.email,
    ).toBeNull()

    const confirmed = await post('/api/correo/confirmar', {
      token: lastToken(),
    })

    expect(confirmed.status).toBe(200)
    const after = await request(env, '/api/yo', { method: 'GET' }, session)
    expect(
      ((await after.json()) as { user: { email: string | null } }).user.email,
    ).toBe('juan@ejemplo.com')
  })

  it('después de confirmar, ese correo sirve para recuperar la contraseña', async () => {
    const session = await register('juan')
    await post('/api/correo', { email: 'juan@ejemplo.com' }, session)
    await post('/api/correo/confirmar', { token: lastToken() })

    await post('/api/recuperar', { identifier: 'juan@ejemplo.com' })

    expect(sent).toHaveLength(2)
    expect(sent[1].body.subject).toBe('Recupera tu contraseña de TrucoStats')
  })

  it('el enlace de confirmación se usa una sola vez y uno nuevo reemplaza al anterior', async () => {
    const session = await register('juan')
    await post('/api/correo', { email: 'uno@ejemplo.com' }, session)
    const first = lastToken()
    await post('/api/correo', { email: 'dos@ejemplo.com' }, session)
    const second = lastToken()

    expect((await post('/api/correo/confirmar', { token: first })).status).toBe(
      400,
    )
    expect(
      (await post('/api/correo/confirmar', { token: second })).status,
    ).toBe(200)
    expect(
      (await post('/api/correo/confirmar', { token: second })).status,
    ).toBe(400)
  })

  it('no deja usar un correo que ya es de otra cuenta', async () => {
    await register('ana', 'ana@ejemplo.com')
    const session = await register('juan')

    const response = await post(
      '/api/correo',
      { email: 'ana@ejemplo.com' },
      session,
    )

    expect(response.status).toBe(409)
    expect(sent).toEqual([])
  })

  it('rechaza un correo inválido y el que la cuenta ya tiene', async () => {
    const session = await register('juan', 'juan@ejemplo.com')

    expect(
      (await post('/api/correo', { email: 'no-es-correo' }, session)).status,
    ).toBe(400)
    expect(
      (await post('/api/correo', { email: 'juan@ejemplo.com' }, session))
        .status,
    ).toBe(409)
  })

  it('exige una cuenta registrada', async () => {
    expect((await post('/api/correo', { email: 'a@b.com' })).status).toBe(401)
  })

  it('avisa si el envío de correos no está configurado', async () => {
    const session = await register('juan')
    env.BREVO_API_KEY = undefined

    const response = await post(
      '/api/correo',
      { email: 'juan@ejemplo.com' },
      session,
    )

    expect(response.status).toBe(503)
  })

  it('avisa si el correo no se pudo enviar y no deja un enlace pendiente', async () => {
    const session = await register('juan')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 })),
    )

    const response = await post(
      '/api/correo',
      { email: 'juan@ejemplo.com' },
      session,
    )

    expect(response.status).toBe(502)
    const left = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM email_tokens',
    ).first<{ total: number }>()
    expect(left?.total).toBe(0)
  })

  it('si otra cuenta se quedó con el correo antes de confirmar, no lo pisa', async () => {
    const session = await register('juan')
    await post('/api/correo', { email: 'compartido@ejemplo.com' }, session)
    const token = lastToken()
    await register('ana', 'compartido@ejemplo.com')

    const response = await post('/api/correo/confirmar', { token })

    expect(response.status).toBe(409)
  })
})
