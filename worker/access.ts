import type { Env } from './groups'
import { errorResponse } from './http'
import { authenticate } from './users'

export interface Membership {
  memberId: string
  isAdmin: boolean
}

// Qué integrante del grupo es esta cuenta (null si no pertenece al grupo).
export async function membershipOf(
  userId: string,
  groupId: string,
  env: Env,
): Promise<Membership | null> {
  const row = await env.DB.prepare(
    `SELECT id, is_admin FROM members
     WHERE group_id = ? AND user_id = ? AND active = 1`,
  )
    .bind(groupId, userId)
    .first<{ id: string; is_admin: number }>()
  return row ? { memberId: row.id, isAdmin: row.is_admin === 1 } : null
}

// Solo los integrantes vinculados a una cuenta pueden ver y registrar partidas.
// Devuelve quién es o la respuesta de error que corresponde.
export async function requireMember(
  groupId: string,
  request: Request,
  env: Env,
): Promise<{ userId: string; membership: Membership } | Response> {
  const user = await authenticate(request, env)
  if (!user) {
    return errorResponse('No iniciaste sesión', 401)
  }
  const membership = await membershipOf(user.id, groupId, env)
  if (!membership) {
    return errorResponse('No eres integrante de este grupo', 403)
  }
  return { userId: user.id, membership }
}
