import { requireMember } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode, loadMatch } from './matches'

const MAX_REASON_LENGTH = 200

interface MatchState {
  created_by: string | null
  canceled_at: string | null
  canceled_by: string | null
}

// Cancela una partida: no se borra, queda marcada y deja de contar. La puede
// cancelar el administrador o quien la registró. Cancelar una partida ya
// cancelada no cambia nada.
export async function cancelMatch(
  inviteCode: string,
  matchId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  return changeMatch('cancel', inviteCode, matchId, request, env)
}

// Restaura una partida cancelada: vuelve a contar. La puede restaurar el
// administrador o quien la canceló.
export async function restoreMatch(
  inviteCode: string,
  matchId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  return changeMatch('restore', inviteCode, matchId, request, env)
}

async function changeMatch(
  action: 'cancel' | 'restore',
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

  const state = await env.DB.prepare(
    'SELECT created_by, canceled_at, canceled_by FROM matches WHERE id = ? AND group_id = ?',
  )
    .bind(matchId, groupId)
    .first<MatchState>()
  if (!state) {
    return errorResponse('Partida no encontrada', 404)
  }

  const { userId, membership } = access
  const responsible = action === 'cancel' ? state.created_by : state.canceled_by
  if (!membership.isAdmin && responsible !== userId) {
    return errorResponse(
      action === 'cancel'
        ? 'Solo el administrador o quien registró la partida puede cancelarla'
        : 'Solo el administrador o quien la canceló puede restaurarla',
      403,
    )
  }

  const alreadyDone =
    action === 'cancel'
      ? state.canceled_at !== null
      : state.canceled_at === null
  if (!alreadyDone) {
    let reason: string | null = null
    if (action === 'cancel') {
      let body: unknown = null
      try {
        body = await request.json()
      } catch {
        // Sin cuerpo: se cancela sin motivo.
      }
      const raw = (body as { reason?: unknown } | null)?.reason
      if (raw !== undefined && raw !== null) {
        if (typeof raw !== 'string' || raw.length > MAX_REASON_LENGTH) {
          return errorResponse(
            `El motivo debe ser texto de hasta ${MAX_REASON_LENGTH} caracteres`,
            400,
          )
        }
        reason = raw.trim() === '' ? null : raw.trim()
      }
    }
    const now = new Date().toISOString()
    // El estado actual y el registro del evento se guardan juntos.
    await env.DB.batch([
      action === 'cancel'
        ? env.DB.prepare(
            'UPDATE matches SET canceled_at = ?, canceled_by = ?, cancel_reason = ? WHERE id = ?',
          ).bind(now, userId, reason, matchId)
        : env.DB.prepare(
            'UPDATE matches SET canceled_at = NULL, canceled_by = NULL, cancel_reason = NULL WHERE id = ?',
          ).bind(matchId),
      env.DB.prepare(
        'INSERT INTO match_events (match_id, action, user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(matchId, action, userId, reason, now),
    ])
  }

  return json({ match: await loadMatch(matchId, env) })
}
