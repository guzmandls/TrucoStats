// Cliente de la API del backend (Worker). Toda llamada puede fallar si no hay
// conexión: quien la usa decide qué hacer en ese caso.

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
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
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

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
