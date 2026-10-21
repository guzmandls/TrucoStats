import { membershipOf } from './access'
import { isNonEmptyString, MAX_NAME_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

const MAX_ALIASES = 10

// Nombre en minúsculas y sin tildes, para comparar apodos sin que importe cómo
// se escribieron ("Juancho", "juancho", "JUANCHÓ").
export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Cambia los apodos de un integrante (reemplaza la lista completa). Los apodos
// son los nombres con los que pudieron anotarlo en partidas anteriores como
// invitado: esas partidas pasan a contar para él. Lo puede hacer el propio
// integrante o un administrador (que también puede sacar apodos). Un apodo no
// puede repetirse dentro del grupo ni coincidir con el nombre de otro integrante.
export async function setAliases(
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
      'Solo el administrador o el propio integrante pueden cambiar los apodos',
      403,
    )
  }
  const target = await env.DB.prepare(
    'SELECT id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<{ id: string }>()
  if (!target) {
    return errorResponse('Integrante no encontrado', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const raw = (body as { aliases?: unknown } | null)?.aliases
  if (
    !Array.isArray(raw) ||
    raw.length > MAX_ALIASES ||
    !raw.every((alias) => isNonEmptyString(alias, MAX_NAME_LENGTH))
  ) {
    return errorResponse(
      `Los apodos son una lista de hasta ${MAX_ALIASES} nombres (hasta ${MAX_NAME_LENGTH} caracteres cada uno)`,
      400,
    )
  }
  // Sin repetidos dentro de la misma lista.
  const aliases: { alias: string; norm: string }[] = []
  for (const alias of raw as string[]) {
    const norm = normalizeAlias(alias)
    if (!aliases.some((item) => item.norm === norm)) {
      aliases.push({ alias: alias.trim(), norm })
    }
  }

  const { results: others } = await env.DB.prepare(
    'SELECT alias, alias_norm FROM member_aliases WHERE group_id = ? AND member_id <> ?',
  )
    .bind(groupId, memberId)
    .all<{ alias: string; alias_norm: string }>()
  const { results: names } = await env.DB.prepare(
    'SELECT name FROM members WHERE group_id = ? AND active = 1 AND id <> ?',
  )
    .bind(groupId, memberId)
    .all<{ name: string }>()
  for (const item of aliases) {
    if (others.some((other) => other.alias_norm === item.norm)) {
      return errorResponse(
        `El apodo “${item.alias}” ya lo tiene otro integrante`,
        409,
      )
    }
    if (names.some((other) => normalizeAlias(other.name) === item.norm)) {
      return errorResponse(
        `“${item.alias}” es el nombre de otro integrante`,
        409,
      )
    }
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM member_aliases WHERE member_id = ?').bind(
      memberId,
    ),
    ...aliases.map((item) =>
      env.DB.prepare(
        'INSERT INTO member_aliases (group_id, member_id, alias, alias_norm) VALUES (?, ?, ?, ?)',
      ).bind(groupId, memberId, item.alias, item.norm),
    ),
  ])
  return json({ aliases: aliases.map((item) => item.alias) })
}
