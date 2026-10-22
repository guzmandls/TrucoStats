import { requireMember } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

const MAX_STATE_LENGTH = 20_000
const MAX_LIVE_PER_GROUP = 20
// Una partida en vivo se mantiene aunque se cierre el contador (puede quedar
// pausada un buen rato). Si pasan tantas horas sin que nadie la toque, se da por
// abandonada.
export const LIVE_TTL_MS = 12 * 60 * 60 * 1000
// Una partida que terminó o se canceló sigue figurando con ese estado este
// tiempo, para que quien la miraba vea el mensaje.
export const ENDED_VISIBLE_MS = 60 * 60 * 1000

type LiveStatus = 'live' | 'finished' | 'canceled'
const STATUSES: LiveStatus[] = ['live', 'finished', 'canceled']
const MAX_REASON_LENGTH = 200

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

  // Se limpian las abandonadas y las que terminaron hace rato.
  const cutoff = new Date(Date.now() - LIVE_TTL_MS).toISOString()
  const endedCutoff = new Date(Date.now() - ENDED_VISIBLE_MS).toISOString()
  await env.DB.prepare(
    `DELETE FROM live_matches WHERE group_id = ? AND (
       (status = 'live' AND updated_at < ?) OR (status <> 'live' AND ended_at < ?))`,
  )
    .bind(groupId, cutoff, endedCutoff)
    .run()

  const existing = await env.DB.prepare(
    'SELECT group_id, status FROM live_matches WHERE id = ?',
  )
    .bind(liveId)
    .first<{ group_id: string; status: LiveStatus }>()
  if (existing && existing.group_id !== groupId) {
    return errorResponse('Ya existe una partida en vivo con ese id', 409)
  }
  // Una vez terminada o cancelada no vuelve a estar en vivo: una actualización
  // atrasada (por ejemplo, de un celular que tardó en enviar) no la resucita.
  if (existing && existing.status !== 'live') {
    return json({ ok: true })
  }
  if (!existing) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM live_matches WHERE group_id = ? AND status = 'live'",
    )
      .bind(groupId)
      .first<{ total: number }>()
    if ((count?.total ?? 0) >= MAX_LIVE_PER_GROUP) {
      return errorResponse('Hay demasiadas partidas en vivo en el grupo', 409)
    }
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO live_matches (id, group_id, state, started_at, updated_at, status, ended_at, end_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at,
       status = excluded.status, ended_at = excluded.ended_at, end_reason = excluded.end_reason`,
  )
    .bind(
      liveId,
      groupId,
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

// La partida en vivo se borra sin dejar rastro (por ejemplo, si se abrió el
// contador y se salió sin jugar ningún punto).
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
  await env.DB.prepare(
    "DELETE FROM live_matches WHERE id = ? AND group_id = ? AND status = 'live'",
  )
    .bind(liveId, groupId)
    .run()
  return json({ ok: true })
}

interface LiveRow {
  id: string
  state: string
  started_at: string
  updated_at: string
  status: LiveStatus
  ended_at: string | null
  end_reason: string | null
}

// Las partidas en vivo del grupo, de la más antigua a la más nueva: las que
// siguen en juego y las que terminaron o se cancelaron hace poco (con su estado).
// Incluye hace cuánto se actualizó cada una, según el reloj del servidor, para
// que quien mira sepa si el contador sigue abierto. Solo las ven los integrantes
// del grupo.
export async function listLive(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await memberGroup(inviteCode, request, env)
  if (groupId instanceof Response) {
    return groupId
  }
  const now = Date.now()
  const cutoff = new Date(now - LIVE_TTL_MS).toISOString()
  const endedCutoff = new Date(now - ENDED_VISIBLE_MS).toISOString()
  const { results } = await env.DB.prepare(
    `SELECT id, state, started_at, updated_at, status, ended_at, end_reason
     FROM live_matches
     WHERE group_id = ? AND (
       (status = 'live' AND updated_at >= ?) OR (status <> 'live' AND ended_at >= ?))
     ORDER BY started_at, id`,
  )
    .bind(groupId, cutoff, endedCutoff)
    .all<LiveRow>()
  return json({
    live: results.map((row) => ({
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
    })),
  })
}
