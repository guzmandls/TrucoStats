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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  // Con sesión iniciada, cada pedido lleva el token para que el servidor sepa
  // quién es.
  const token = getToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
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
