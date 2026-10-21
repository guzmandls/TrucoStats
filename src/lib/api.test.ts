import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, postJson } from './api'
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
