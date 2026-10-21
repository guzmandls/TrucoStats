import { requireMember } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

const MAX_STATE_LENGTH = 20_000
const MAX_LIVE_PER_GROUP = 20
// Si nadie actualiza la partida en este tiempo, se considera terminada (el
// contador la renueva cada pocos segundos mientras está abierto).
export const LIVE_TTL_MS = 5 * 60 * 1000

// Comprueba que quien pregunta es integrante del grupo. Devuelve el grupo o la
// respuesta de error que corresponde.
async function memberGroup(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<string | Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const access = await requireMember(groupId, request, env)
  return access instanceof Response ? access : groupId
}

// El contador de una partida de grupo publica cómo va la partida (equipos,
// puntos, tiempo). Cada partida tiene su propio id, así que puede haber varias
// en vivo a la vez en el mismo grupo. Solo pueden publicar los integrantes.
export async function publishLive(
  inviteCode: string,
  liveId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await memberGroup(inviteCode, request, env)
  if (groupId instanceof Response) {
    return groupId
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

  // Se limpian las que hace rato que nadie actualiza.
  const cutoff = new Date(Date.now() - LIVE_TTL_MS).toISOString()
  await env.DB.prepare(
    'DELETE FROM live_matches WHERE group_id = ? AND updated_at < ?',
  )
    .bind(groupId, cutoff)
    .run()

  const existing = await env.DB.prepare(
    'SELECT group_id FROM live_matches WHERE id = ?',
  )
    .bind(liveId)
    .first<{ group_id: string }>()
  if (existing && existing.group_id !== groupId) {
    return errorResponse('Ya existe una partida en vivo con ese id', 409)
  }
  if (!existing) {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM live_matches WHERE group_id = ?',
    )
      .bind(groupId)
      .first<{ total: number }>()
    if ((count?.total ?? 0) >= MAX_LIVE_PER_GROUP) {
      return errorResponse('Hay demasiadas partidas en vivo en el grupo', 409)
    }
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO live_matches (id, group_id, state, started_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
  )
    .bind(liveId, groupId, text, now, now)
    .run()
  return json({ ok: true })
}

// La partida terminó o se cerró el contador: deja de mostrarse.
export async function stopLive(
  inviteCode: string,
  liveId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await memberGroup(inviteCode, request, env)
  if (groupId instanceof Response) {
    return groupId
  }
  await env.DB.prepare('DELETE FROM live_matches WHERE id = ? AND group_id = ?')
    .bind(liveId, groupId)
    .run()
  return json({ ok: true })
}

interface LiveRow {
  id: string
  state: string
  started_at: string
  updated_at: string
}

// Las partidas en vivo del grupo (las que se actualizaron hace poco), de la
// más antigua a la más nueva. Solo las ven los integrantes del grupo.
export async function listLive(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await memberGroup(inviteCode, request, env)
  if (groupId instanceof Response) {
    return groupId
  }
  const cutoff = new Date(Date.now() - LIVE_TTL_MS).toISOString()
  const { results } = await env.DB.prepare(
    `SELECT id, state, started_at, updated_at FROM live_matches
     WHERE group_id = ? AND updated_at >= ? ORDER BY started_at, id`,
  )
    .bind(groupId, cutoff)
    .all<LiveRow>()
  return json({
    live: results.map((row) => ({
      id: row.id,
      state: JSON.parse(row.state) as unknown,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    })),
  })
}
