import type { Env } from './groups'
import { errorResponse, json } from './http'
import { ENDED_VISIBLE_MS, LIVE_TTL_MS } from './live'
import { authenticate } from './users'

const MAX_STATE_LENGTH = 20_000
const MAX_REASON_LENGTH = 200
// Una misma cuenta no comparte muchas partidas a la vez.
const MAX_SHARED_PER_USER = 5

type LiveStatus = 'live' | 'finished' | 'canceled'
const STATUSES: LiveStatus[] = ['live', 'finished', 'canceled']

interface SharedRow {
  id: string
  user_id: string
  state: string
  started_at: string
  updated_at: string
  status: LiveStatus
  ended_at: string | null
  end_reason: string | null
}

// Las que ya no se muestran: abandonadas o terminadas hace rato.
function visibleSince(now: number) {
  return {
    cutoff: new Date(now - LIVE_TTL_MS).toISOString(),
    endedCutoff: new Date(now - ENDED_VISIBLE_MS).toISOString(),
  }
}

// Quien cuenta una partida rápida la comparte en vivo: publica (o actualiza)
// cómo va. Hace falta una cuenta registrada, y solo esa cuenta la actualiza.
export async function publishShared(
  shareId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse('Necesitas una cuenta para compartir en vivo', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const fields = (typeof body === 'object' && body !== null ? body : {}) as {
    state?: unknown
    status?: unknown
    reason?: unknown
  }
  const state = fields.state
  const status = fields.status ?? 'live'
  if (typeof status !== 'string' || !STATUSES.includes(status as LiveStatus)) {
    return errorResponse('El estado de la partida en vivo no es válido', 400)
  }
  const reason =
    typeof fields.reason === 'string' && fields.reason.trim() !== ''
      ? fields.reason.trim().slice(0, MAX_REASON_LENGTH)
      : null
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    return errorResponse('Falta el estado de la partida', 400)
  }
  const text = JSON.stringify(state)
  if (text.length > MAX_STATE_LENGTH) {
    return errorResponse('El estado de la partida es demasiado grande', 400)
  }

  const { cutoff, endedCutoff } = visibleSince(Date.now())
  await env.DB.prepare(
    `DELETE FROM shared_lives WHERE user_id = ? AND (
       (status = 'live' AND updated_at < ?) OR (status <> 'live' AND ended_at < ?))`,
  )
    .bind(user.id, cutoff, endedCutoff)
    .run()

  const existing = await env.DB.prepare(
    'SELECT user_id, status FROM shared_lives WHERE id = ?',
  )
    .bind(shareId)
    .first<{ user_id: string; status: LiveStatus }>()
  if (existing && existing.user_id !== user.id) {
    return errorResponse('Esta partida la comparte otra cuenta', 403)
  }
  // Una vez terminada o cancelada no vuelve a estar en vivo.
  if (existing && existing.status !== 'live') {
    return json({ ok: true })
  }
  if (!existing) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM shared_lives WHERE user_id = ? AND status = 'live'",
    )
      .bind(user.id)
      .first<{ total: number }>()
    if ((count?.total ?? 0) >= MAX_SHARED_PER_USER) {
      return errorResponse('Ya compartes demasiadas partidas en vivo', 409)
    }
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO shared_lives (id, user_id, state, started_at, updated_at, status, ended_at, end_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at,
       status = excluded.status, ended_at = excluded.ended_at, end_reason = excluded.end_reason`,
  )
    .bind(
      shareId,
      user.id,
      text,
      now,
      now,
      status,
      status === 'live' ? null : now,
      status === 'live' ? null : reason,
    )
    .run()
  return json({ ok: true })
}

// Cualquiera con el enlace mira la partida compartida, sin cuenta. Incluye
// hace cuánto se actualizó, según el reloj del servidor.
export async function getShared(shareId: string, env: Env): Promise<Response> {
  const now = Date.now()
  const { cutoff, endedCutoff } = visibleSince(now)
  const row = await env.DB.prepare(
    `SELECT id, user_id, state, started_at, updated_at, status, ended_at, end_reason
     FROM shared_lives
     WHERE id = ? AND (
       (status = 'live' AND updated_at >= ?) OR (status <> 'live' AND ended_at >= ?))`,
  )
    .bind(shareId, cutoff, endedCutoff)
    .first<SharedRow>()
  if (!row) {
    return errorResponse('No se encontró la partida', 404)
  }
  return json({
    live: {
      id: row.id,
      state: JSON.parse(row.state) as unknown,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      ageSeconds: Math.max(
        0,
        Math.floor((now - Date.parse(row.updated_at)) / 1000),
      ),
      status: row.status,
      endedAt: row.ended_at,
      reason: row.end_reason,
    },
  })
}
