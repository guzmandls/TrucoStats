import {
  isNonEmptyString,
  MAX_AVATAR_LENGTH,
  MAX_NAME_LENGTH,
  type Env,
} from './groups'
import { errorResponse, json } from './http'
import { membershipOf } from './access'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

// Cambia el nombre y/o la foto de un integrante (la foto null la quita). Sin
// cuentas todavía, cualquiera que tenga el código del grupo puede hacerlo.
export async function updateMember(
  inviteCode: string,
  memberId: string,
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
  if (
    !membership ||
    (!membership.isAdmin && membership.memberId !== memberId)
  ) {
    return errorResponse(
      'Solo el administrador o el propio integrante pueden cambiarlo',
      403,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const fields = (typeof body === 'object' && body !== null ? body : {}) as {
    name?: unknown
    avatar?: unknown
  }
  const hasAvatar = 'avatar' in fields
  // Sin foto en el pedido, el nombre sigue siendo obligatorio.
  const hasName = !hasAvatar || 'name' in fields
  if (hasName && !isNonEmptyString(fields.name, MAX_NAME_LENGTH)) {
    return errorResponse(
      `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }
  if (
    hasAvatar &&
    fields.avatar !== null &&
    !isNonEmptyString(fields.avatar, MAX_AVATAR_LENGTH)
  ) {
    return errorResponse('La foto no es válida', 400)
  }

  const member = await env.DB.prepare(
    'SELECT id, user_id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<{ id: string; user_id: string | null }>()
  if (!member) {
    return errorResponse('Integrante no encontrado', 404)
  }
  // El administrador solo puede cambiar el nombre de un integrante que nadie
  // eligió todavía; quien ya eligió su lugar es el único que cambia su nombre.
  if (hasName && membership.memberId !== memberId && member.user_id) {
    return errorResponse(
      'Solo el propio integrante puede cambiar su nombre una vez que eligió su lugar',
      403,
    )
  }

  const statements = []
  if (hasName) {
    const name = (fields.name as string).trim()
    // Las partidas ya guardadas conservan el nombre del integrante, así que
    // también se actualizan para que el grupo se vea coherente.
    statements.push(
      env.DB.prepare('UPDATE members SET name = ? WHERE id = ?').bind(
        name,
        memberId,
      ),
      env.DB.prepare(
        'UPDATE match_players SET name = ? WHERE member_id = ?',
      ).bind(name, memberId),
    )
  }
  if (hasAvatar) {
    statements.push(
      env.DB.prepare('UPDATE members SET avatar = ? WHERE id = ?').bind(
        fields.avatar,
        memberId,
      ),
    )
  }
  await env.DB.batch(statements)

  const updated = await env.DB.prepare(
    'SELECT id, name, avatar FROM members WHERE id = ?',
  )
    .bind(memberId)
    .first<{ id: string; name: string; avatar: string | null }>()
  return json({
    member: {
      id: memberId,
      name: updated?.name,
      ...(updated?.avatar ? { avatar: updated.avatar } : {}),
    },
  })
}
