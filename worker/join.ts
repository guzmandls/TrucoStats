import { linkAvatarStatements } from './accountAvatar'
import { membershipOf } from './access'
import { isNonEmptyString, MAX_NAME_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

// Une a una persona a un grupo eligiendo uno de sus integrantes. Hace falta una
// cuenta registrada: así el lugar queda de una persona que puede volver a
// entrar desde cualquier celular (y no trabado en una cuenta sin datos).
export async function joinGroup(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const fields = (typeof body === 'object' && body !== null ? body : {}) as {
    memberId?: unknown
    name?: unknown
  }
  if (typeof fields.memberId !== 'string') {
    return errorResponse('Falta elegir un integrante', 400)
  }
  if (
    fields.name !== undefined &&
    !isNonEmptyString(fields.name, MAX_NAME_LENGTH)
  ) {
    return errorResponse(
      `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }

  const member = await env.DB.prepare(
    'SELECT id, name, user_id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(fields.memberId, groupId)
    .first<{ id: string; name: string; user_id: string | null }>()
  if (!member) {
    return errorResponse('Integrante no encontrado', 404)
  }

  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse('Necesitas una cuenta para unirte a un grupo', 401)
  }
  const current = await membershipOf(user.id, groupId, env)
  if (current && current.memberId !== member.id) {
    return errorResponse('Ya eres otro integrante de este grupo', 409)
  }
  if (member.user_id && member.user_id !== user.id) {
    return errorResponse('Ese integrante ya fue elegido por otra persona', 409)
  }

  const name = fields.name === undefined ? member.name : fields.name.trim()

  // Las partidas ya guardadas muestran el nombre nuevo.
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE members SET user_id = ?, name = ? WHERE id = ?',
    ).bind(user.id, name, member.id),
    env.DB.prepare(
      'UPDATE match_players SET name = ? WHERE member_id = ?',
    ).bind(name, member.id),
    ...linkAvatarStatements(user.id, member.id, env),
  ])

  return json({
    user,
    memberId: member.id,
    member: { id: member.id, name },
  })
}
