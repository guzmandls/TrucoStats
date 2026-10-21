import { requireMember } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

interface EventRow {
  action: 'cancel' | 'restore'
  user_id: string
  reason: string | null
  created_at: string
  member_name: string | null
}

// Todo lo que pasó con una partida, del más antiguo al más reciente: cuándo se
// registró y cada cancelación o restauración, con quién la hizo (el nombre del
// integrante de esa cuenta) y el motivo. Lo puede ver cualquier integrante del
// grupo: la transparencia es lo que evita que se oculte una partida.
export async function matchHistory(
  inviteCode: string,
  matchId: string,
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

  const match = await env.DB.prepare(
    `SELECT m.registered_at,
       (SELECT name FROM members WHERE group_id = m.group_id AND user_id = m.created_by) AS member_name
     FROM matches m WHERE m.id = ? AND m.group_id = ?`,
  )
    .bind(matchId, groupId)
    .first<{ registered_at: string | null; member_name: string | null }>()
  if (!match) {
    return errorResponse('Partida no encontrada', 404)
  }

  const { results } = await env.DB.prepare(
    `SELECT e.action, e.user_id, e.reason, e.created_at,
       (SELECT name FROM members WHERE group_id = ? AND user_id = e.user_id) AS member_name
     FROM match_events e WHERE e.match_id = ? ORDER BY e.id`,
  )
    .bind(groupId, matchId)
    .all<EventRow>()

  return json({
    events: [
      ...(match.registered_at
        ? [
            {
              action: 'register',
              by: match.member_name,
              reason: null,
              at: match.registered_at,
            },
          ]
        : []),
      ...results.map((event) => ({
        action: event.action,
        by: event.member_name,
        reason: event.reason,
        at: event.created_at,
      })),
    ],
  })
}
