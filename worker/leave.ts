import { ensureAdmin } from './admin'
import { membershipOf } from './access'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

// La persona sale del grupo: su integrante queda libre (otra persona puede
// elegirlo) y conserva sus partidas. Si era administrador pierde el rol y, si el
// grupo se queda sin administradores, pasa solo a otro. Si era el único
// integrante, el grupo se elimina (las partidas se conservan para los perfiles).
export async function leaveGroup(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const user = await authenticate(request, env)
  if (!user) {
    return errorResponse('No iniciaste sesión', 401)
  }
  const membership = await membershipOf(user.id, groupId, env)
  if (!membership) {
    return errorResponse('No eres integrante de este grupo', 403)
  }

  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM members WHERE group_id = ? AND active = 1',
  )
    .bind(groupId)
    .first<{ total: number }>()
  if ((count?.total ?? 0) <= 1) {
    // Los integrantes se borran junto con el grupo (ON DELETE CASCADE).
    await env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run()
    return json({ deleted: true })
  }

  await env.DB.prepare(
    'UPDATE members SET user_id = NULL, is_admin = 0 WHERE id = ?',
  )
    .bind(membership.memberId)
    .run()
  await ensureAdmin(groupId, env)
  return json({ deleted: false })
}
