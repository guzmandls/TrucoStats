import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, getVersioned, postJson } from './api'
import { clearSession, saveSession } from './session'

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) {
      throw response
    }
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('devuelve el JSON de una respuesta correcta', async () => {
    mockFetch(jsonResponse({ estado: 'ok' }))

    expect(await apiRequest('/api/salud')).toEqual({ estado: 'ok' })
  })

  it('lanza ApiError con el mensaje y el estado del servidor', async () => {
    mockFetch(jsonResponse({ error: 'Grupo no encontrado' }, 404))

    await expect(apiRequest('/api/grupos/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Grupo no encontrado',
    })
  })

  it('usa un mensaje genérico si el error no es JSON', async () => {
    mockFetch(new Response('boom', { status: 500 }))

    await expect(apiRequest('/api/salud')).rejects.toThrow('Error 500')
  })

  it('deja pasar el error de red (sin conexión)', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error = await apiRequest('/api/salud').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TypeError)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})

describe('postJson', () => {
  it('envía el cuerpo como JSON con el método POST', async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }, 201))

    await postJson('/api/grupos', { name: 'Los pibes' })

    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/grupos')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'Los pibes' }))
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/json',
    )
  })
})

describe('apiRequest con sesión', () => {
  it('envía el token en cada pedido cuando hay sesión', async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    saveSession({
      token: 'c'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })

    await apiRequest('/api/yo')

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${'c'.repeat(64)}`,
    )
    clearSession()
  })

  it('no envía autorización sin sesión', async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))

    await apiRequest('/api/salud')

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(
      (init.headers as Record<string, string>).authorization,
    ).toBeUndefined()
  })
})

describe('sesión vencida', () => {
  const session = {
    token: 'a'.repeat(64),
    user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
  }

  afterEach(() => {
    clearSession()
  })

  it('un 401 con sesión guardada la marca como vencida', async () => {
    saveSession(session)
    mockFetch(jsonResponse({ error: 'No iniciaste sesión' }, 401))

    await expect(apiRequest('/api/yo')).rejects.toBeInstanceOf(ApiError)

    expect(localStorage.getItem('trucostats.sessionExpired')).toBe('1')
  })

  it('un 401 al iniciar sesión (contraseña incorrecta) no la marca como vencida', async () => {
    saveSession(session)
    mockFetch(jsonResponse({ error: 'Usuario o contraseña incorrectos' }, 401))

    await expect(
      postJson('/api/sesion', { username: 'juan', password: 'x' }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(localStorage.getItem('trucostats.sessionExpired')).toBeNull()
  })

  it('sin sesión guardada un 401 no marca nada', async () => {
    mockFetch(jsonResponse({ error: 'No iniciaste sesión' }, 401))

    await expect(apiRequest('/api/yo')).rejects.toBeInstanceOf(ApiError)

    expect(localStorage.getItem('trucostats.sessionExpired')).toBeNull()
  })

  it('al iniciar sesión de nuevo el aviso se borra', async () => {
    saveSession(session)
    mockFetch(jsonResponse({}, 401))
    await expect(apiRequest('/api/yo')).rejects.toBeInstanceOf(ApiError)

    saveSession(session)

    expect(localStorage.getItem('trucostats.sessionExpired')).toBeNull()
  })
})

describe('getVersioned', () => {
  const session = (token: string) => ({
    token,
    user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
  })

  // Un servidor que responde 304 si le mandan la versión actual.
  function versionedServer(versions: { tag: string; body: unknown }[]) {
    let current = 0
    const sent: (string | null)[] = []
    const fetchMock = vi.fn(async (_path: string, init: RequestInit = {}) => {
      const tag = new Headers(init.headers).get('if-none-match')
      sent.push(tag)
      const { tag: now, body } = versions[current]
      return tag === now
        ? new Response(null, { status: 304, headers: { etag: now } })
        : new Response(JSON.stringify(body), { headers: { etag: now } })
    })
    vi.stubGlobal('fetch', fetchMock)
    return { sent, change: () => (current += 1) }
  }

  afterEach(() => clearSession())

  it('manda la versión que tiene y, si no cambió, usa la respuesta guardada', async () => {
    saveSession(session('a'.repeat(64)))
    const server = versionedServer([
      { tag: 'W/"1"', body: { matches: [1] } },
      { tag: 'W/"2"', body: { matches: [1, 2] } },
    ])
    const path = `/api/grupos/${'c'.repeat(32)}/partidas`

    expect(await getVersioned(path)).toEqual({ matches: [1] })
    expect(await getVersioned(path)).toEqual({ matches: [1] })
    server.change()
    expect(await getVersioned(path)).toEqual({ matches: [1, 2] })

    expect(server.sent).toEqual([null, 'W/"1"', 'W/"1"'])
  })

  it('con otra sesión no usa lo guardado de la anterior', async () => {
    saveSession(session('a'.repeat(64)))
    const server = versionedServer([{ tag: 'W/"1"', body: { ok: 1 } }])
    const path = `/api/grupos/${'d'.repeat(32)}`
    await getVersioned(path)

    saveSession(session('b'.repeat(64)))
    await getVersioned(path)

    expect(server.sent).toEqual([null, null])
  })
})
