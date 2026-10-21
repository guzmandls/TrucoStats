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
    `SELECT m.id, g.admin_member_id FROM members m
     JOIN groups g ON g.id = m.group_id
     WHERE m.group_id = ? AND m.user_id = ? AND m.active = 1`,
  )
    .bind(groupId, userId)
    .first<{ id: string; admin_member_id: string }>()
  return row
    ? { memberId: row.id, isAdmin: row.id === row.admin_member_id }
    : null
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
