import { requireMember } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

const MAX_STATE_LENGTH = 20_000
// Si nadie actualiza la partida en este tiempo, se considera terminada (el
// contador la renueva cada pocos segundos mientras está abierto).
export const LIVE_TTL_MS = 5 * 60 * 1000

// El contador de una partida de grupo publica cómo va la partida (equipos,
// puntos, tiempo). Solo pueden publicar los integrantes del grupo.
export async function publishLive(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const access = await requireMember(groupId, request, env)
  if (access instanceof Response) {
    return access
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const state = (body as { state?: unknown } | null)?.state
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    return errorResponse('Falta el estado de la partida', 400)
  }
  const text = JSON.stringify(state)
  if (text.length > MAX_STATE_LENGTH) {
    return errorResponse('El estado de la partida es demasiado grande', 400)
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO live_matches (group_id, state, started_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (group_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
  )
    .bind(groupId, text, now, now)
    .run()
  return json({ ok: true })
}

// La partida terminó o se cerró el contador: deja de mostrarse.
export async function stopLive(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const access = await requireMember(groupId, request, env)
  if (access instanceof Response) {
    return access
  }
  await env.DB.prepare('DELETE FROM live_matches WHERE group_id = ?')
    .bind(groupId)
    .run()
  return json({ ok: true })
}

// La partida en vivo del grupo (null si no hay ninguna o hace rato que nadie la
// actualiza). Solo la ven los integrantes del grupo.
export async function getLive(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const access = await requireMember(groupId, request, env)
  if (access instanceof Response) {
    return access
  }
  const row = await env.DB.prepare(
    'SELECT state, started_at, updated_at FROM live_matches WHERE group_id = ?',
  )
    .bind(groupId)
    .first<{ state: string; started_at: string; updated_at: string }>()
  if (!row || Date.now() - Date.parse(row.updated_at) > LIVE_TTL_MS) {
    return json({ live: null })
  }
  return json({
    live: {
      state: JSON.parse(row.state) as unknown,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    },
  })
}
