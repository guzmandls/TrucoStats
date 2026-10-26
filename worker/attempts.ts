import type { Env } from './groups'
import { errorResponse } from './http'

const MINUTE = 60 * 1000

export interface Limit {
  // Cuántos fallos se permiten dentro de la ventana.
  max: number
  windowMs: number
  // Cuánto dura el bloqueo al pasarse.
  lockMs: number
}

// Contraseñas incorrectas de un mismo usuario: 10 en 15 minutos lo bloquean 15.
export const USER_LIMIT: Limit = {
  max: 10,
  windowMs: 15 * MINUTE,
  lockMs: 15 * MINUTE,
}
// Contraseñas incorrectas desde una misma IP (contra cualquier usuario).
export const IP_LIMIT: Limit = {
  max: 30,
  windowMs: 15 * MINUTE,
  lockMs: 15 * MINUTE,
}
// Cuentas nuevas desde una misma IP: 10 por hora.
export const SIGNUP_LIMIT: Limit = {
  max: 10,
  windowMs: 60 * MINUTE,
  lockMs: 60 * MINUTE,
}

export const TOO_MANY_ATTEMPTS =
  'Demasiados intentos. Inténtalo de nuevo en 15 minutos.'

export function tooMany(message = TOO_MANY_ATTEMPTS): Response {
  return errorResponse(message, 429)
}

// La IP de quien pide, según Cloudflare. En local no está, y entonces no se
// limita por IP.
export function clientIp(request: Request): string | null {
  return request.headers.get('cf-connecting-ip')
}

// Los fallos de contraseña cuentan para la cuenta (o el usuario escrito) y para
// la IP. Devuelve las claves a revisar y anotar.
export function passwordKeys(
  request: Request,
  who: string,
): { key: string; limit: Limit }[] {
  const ip = clientIp(request)
  return [
    { key: who, limit: USER_LIMIT },
    ...(ip ? [{ key: `ip:${ip}`, limit: IP_LIMIT }] : []),
  ]
}

export async function anyLocked(
  keys: { key: string }[],
  env: Env,
): Promise<boolean> {
  for (const { key } of keys) {
    if (await isLocked(key, env)) {
      return true
    }
  }
  return false
}

export async function recordFailures(
  keys: { key: string; limit: Limit }[],
  env: Env,
): Promise<void> {
  for (const { key, limit } of keys) {
    await recordFailure(key, limit, env)
  }
}

// Si esa clave (un usuario, una IP) está bloqueada ahora.
export async function isLocked(key: string, env: Env): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT locked_until FROM attempts WHERE key = ?',
  )
    .bind(key)
    .first<{ locked_until: string | null }>()
  return !!row?.locked_until && Date.parse(row.locked_until) > Date.now()
}

// Anota un fallo. Si es el primero de la ventana (o la anterior ya pasó), el
// conteo vuelve a empezar; al llegar al máximo, se bloquea.
export async function recordFailure(
  key: string,
  limit: Limit,
  env: Env,
): Promise<void> {
  const now = Date.now()
  const row = await env.DB.prepare(
    'SELECT failures, first_at FROM attempts WHERE key = ?',
  )
    .bind(key)
    .first<{ failures: number; first_at: string }>()
  const fresh = !row || now - Date.parse(row.first_at) > limit.windowMs
  const failures = fresh ? 1 : row.failures + 1
  const firstAt = fresh ? new Date(now).toISOString() : row.first_at
  const lockedUntil =
    failures >= limit.max ? new Date(now + limit.lockMs).toISOString() : null
  await env.DB.prepare(
    `INSERT INTO attempts (key, failures, first_at, locked_until) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET failures = excluded.failures,
       first_at = excluded.first_at, locked_until = excluded.locked_until`,
  )
    .bind(key, failures, firstAt, lockedUntil)
    .run()
}

export async function clearFailures(key: string, env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run()
}
