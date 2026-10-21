import { isNonEmptyString, MAX_NAME_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

// Cambia el nombre de un integrante. Sin cuentas todavía, cualquiera que tenga
// el código del grupo puede hacerlo.
export async function renameMember(
  inviteCode: string,
  memberId: string,
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
  const name = (body as { name?: unknown } | null)?.name
  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
    return errorResponse(
      `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }

  const member = await env.DB.prepare(
    'SELECT id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<{ id: string }>()
  if (!member) {
    return errorResponse('Integrante no encontrado', 404)
  }

  const trimmed = name.trim()
  // Las partidas ya guardadas conservan el nombre del integrante, así que
  // también se actualizan para que el grupo se vea coherente.
  await env.DB.batch([
    env.DB.prepare('UPDATE members SET name = ? WHERE id = ?').bind(
      trimmed,
      memberId,
    ),
    env.DB.prepare(
      'UPDATE match_players SET name = ? WHERE member_id = ?',
    ).bind(trimmed, memberId),
  ])

  return json({ member: { id: memberId, name: trimmed } })
}
