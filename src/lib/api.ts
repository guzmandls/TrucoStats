// Cliente de la API del backend (Worker). Toda llamada puede fallar si no hay
// conexión: quien la usa decide qué hacer en ese caso.

import { getToken, markSessionExpired } from './session'

const TIMEOUT_MS = 8000

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function send(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    // Siempre la respuesta actual del servidor, nunca una guardada.
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

async function readResponse<T>(
  response: Response,
  path: string,
  token: string | null,
): Promise<T> {
  if (
    !response.ok &&
    response.status === 401 &&
    token &&
    !path.startsWith('/api/sesion') &&
    !path.startsWith('/api/registro')
  ) {
    // Con un token guardado, un 401 significa que la sesión venció o ya no vale.
    markSessionExpired()
  }
  if (!response.ok) {
    let message = `Error ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      message = body.error ?? message
    } catch {
      // La respuesta no era JSON: se queda el mensaje genérico.
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  // Con sesión iniciada, cada pedido lleva el token para que el servidor sepa
  // quién es.
  const token = getToken()
  return readResponse<T>(await send(path, init, token), path, token)
}

// Lo que se pide seguido (el grupo y sus partidas) se guarda con su versión: el
// pedido la manda y, si nada cambió, el servidor contesta 304 sin cuerpo y se
// usa la respuesta guardada. Así actualizar seguido casi no gasta datos ni
// lecturas de la base. Vive solo en memoria: al abrir la app, el primer pedido
// trae todo.
const versioned = new Map<string, { tag: string; body: unknown }>()

export async function getVersioned<T>(path: string): Promise<T> {
  const token = getToken()
  // Depende de quién pregunta: con otra sesión no sirve la respuesta guardada.
  const key = `${token ?? ''} ${path}`
  const known = versioned.get(key)
  const response = await send(
    path,
    known ? { headers: { 'if-none-match': known.tag } } : {},
    token,
  )
  if (response.status === 304 && known) {
    // Una copia, para que nadie pueda modificar la guardada por error.
    return structuredClone(known.body) as T
  }
  const body = await readResponse<T>(response, path, token)
  const tag = response.headers.get('etag')
  if (tag) {
    versioned.set(key, { tag, body: structuredClone(body) })
  } else {
    versioned.delete(key)
  }
  return body
}

export function deleteRequest<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' })
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
