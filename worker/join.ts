import { membershipOf } from './access'
import { isNonEmptyString, MAX_NAME_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate, createGuest } from './users'

// Une a una persona a un grupo eligiendo uno de sus integrantes. Si todavía no
// tiene sesión, se le crea una cuenta invitada y el token vuelve en la
// respuesta para que la app lo guarde.
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

  let user = await authenticate(request, env)
  if (user) {
    const current = await membershipOf(user.id, groupId, env)
    if (current && current.memberId !== member.id) {
      return errorResponse('Ya eres otro integrante de este grupo', 409)
    }
  }
  if (member.user_id && member.user_id !== user?.id) {
    return errorResponse('Ese integrante ya fue elegido por otra persona', 409)
  }

  const name = fields.name === undefined ? member.name : fields.name.trim()
  let token: string | undefined
  if (!user) {
    const guest = await createGuest(name, env)
    user = guest.user
    token = guest.token
  }

  // Las partidas ya guardadas muestran el nombre nuevo.
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE members SET user_id = ?, name = ? WHERE id = ?',
    ).bind(user.id, name, member.id),
    env.DB.prepare(
      'UPDATE match_players SET name = ? WHERE member_id = ?',
    ).bind(name, member.id),
  ])

  return json({
    user,
    ...(token ? { token } : {}),
    memberId: member.id,
    member: { id: member.id, name },
  })
}
