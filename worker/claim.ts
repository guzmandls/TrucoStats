import { linkAvatarStatements } from './accountAvatar'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

// Un grupo creado antes de existir las cuentas llegó al servidor sin ningún
// administrador vinculado a una cuenta. La persona que lo creó (con su cuenta
// registrada) puede reclamar su integrante: queda vinculado y como
// administrador. Se permite mientras el grupo no tenga ningún administrador
// vinculado (aunque otros integrantes ya se hayan unido con el enlace); si ya hay
// uno, hay que elegir un lugar libre con el enlace de invitación.
export async function claimMember(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse(
      'Necesitas una cuenta para reclamar un integrante',
      401,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const memberId = (body as { memberId?: unknown } | null)?.memberId
  if (typeof memberId !== 'string') {
    return errorResponse('Falta elegir un integrante', 400)
  }

  const linked = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM members WHERE group_id = ? AND active = 1 AND is_admin = 1 AND user_id IS NOT NULL',
  )
    .bind(groupId)
    .first<{ total: number }>()
  if ((linked?.total ?? 0) > 0) {
    return errorResponse(
      'Este grupo ya tiene un administrador: elige un lugar libre con el enlace de invitación',
      409,
    )
  }

  const member = await env.DB.prepare(
    'SELECT id, user_id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<{ id: string; user_id: string | null }>()
  if (!member) {
    return errorResponse('Integrante no encontrado', 404)
  }
  if (member.user_id) {
    return errorResponse('Ese integrante ya fue elegido por otra persona', 409)
  }

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE members SET user_id = ?, is_admin = 1 WHERE id = ?',
    ).bind(user.id, member.id),
    ...linkAvatarStatements(user.id, member.id, env),
  ])
  return json({ memberId: member.id })
}
