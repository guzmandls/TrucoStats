import { membershipOf, type Membership } from './access'
import { isNonEmptyString, isAvatar, MAX_NAME_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'
import { authenticate } from './users'

const MAX_MEMBERS = 50
const MAX_ID_LENGTH = 100

interface AdminContext {
  groupId: string
  membership: Membership
}

// Comprueba que quien pregunta es administrador del grupo. Devuelve el grupo y
// quién es, o la respuesta de error que corresponde.
async function requireAdmin(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<AdminContext | Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const user = await authenticate(request, env)
  if (!user) {
    return errorResponse('No iniciaste sesión', 401)
  }
  const membership = await membershipOf(user.id, groupId, env)
  if (!membership?.isAdmin) {
    return errorResponse('Solo un administrador puede hacerlo', 403)
  }
  return { groupId, membership }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    return typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

interface TargetRow {
  id: string
  user_id: string | null
  is_admin: number
}

async function findTarget(
  groupId: string,
  memberId: string,
  env: Env,
): Promise<TargetRow | null> {
  return env.DB.prepare(
    'SELECT id, user_id, is_admin FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<TargetRow>()
}

async function activeMemberCount(groupId: string, env: Env): Promise<number> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM members WHERE group_id = ? AND active = 1',
  )
    .bind(groupId)
    .first<{ total: number }>()
  return row?.total ?? 0
}

// Si el grupo se quedó sin administradores (porque el último se fue, fue dado
// de baja o liberado), el rol pasa solo al integrante con cuenta más antiguo; si
// ninguno tiene cuenta, al integrante más antiguo.
export async function ensureAdmin(groupId: string, env: Env): Promise<void> {
  const admins = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM members WHERE group_id = ? AND active = 1 AND is_admin = 1',
  )
    .bind(groupId)
    .first<{ total: number }>()
  if (admins && admins.total > 0) {
    return
  }
  const next = await env.DB.prepare(
    `SELECT id FROM members WHERE group_id = ? AND active = 1
     ORDER BY (user_id IS NULL), rowid LIMIT 1`,
  )
    .bind(groupId)
    .first<{ id: string }>()
  if (next) {
    await env.DB.prepare('UPDATE members SET is_admin = 1 WHERE id = ?')
      .bind(next.id)
      .run()
  }
}

// Agrega un integrante nuevo al grupo (sin cuenta vinculada todavía).
export async function addMember(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const context = await requireAdmin(inviteCode, request, env)
  if (context instanceof Response) {
    return context
  }
  const fields = await readBody(request)
  if (
    !isNonEmptyString(fields.id, MAX_ID_LENGTH) ||
    !isNonEmptyString(fields.name, MAX_NAME_LENGTH)
  ) {
    return errorResponse(
      `Hace falta un id y un nombre (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }
  if (fields.avatar !== undefined && !isAvatar(fields.avatar)) {
    return errorResponse('La foto no es válida', 400)
  }
  if ((await activeMemberCount(context.groupId, env)) >= MAX_MEMBERS) {
    return errorResponse(
      `El grupo admite hasta ${MAX_MEMBERS} integrantes`,
      409,
    )
  }
  const name = fields.name.trim()
  try {
    await env.DB.prepare(
      'INSERT INTO members (id, group_id, name, avatar) VALUES (?, ?, ?, ?)',
    )
      .bind(fields.id, context.groupId, name, fields.avatar ?? null)
      .run()
  } catch {
    return errorResponse('Ya existe un integrante con ese id', 409)
  }
  return json(
    {
      member: {
        id: fields.id,
        name,
        ...(fields.avatar ? { avatar: fields.avatar } : {}),
      },
    },
    201,
  )
}

// Da de baja a un integrante: deja de aparecer en el grupo, pero sus partidas
// se conservan. Si era el último administrador, el rol pasa solo a otro.
export async function removeMember(
  inviteCode: string,
  memberId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const context = await requireAdmin(inviteCode, request, env)
  if (context instanceof Response) {
    return context
  }
  const target = await findTarget(context.groupId, memberId, env)
  if (!target) {
    return errorResponse('Integrante no encontrado', 404)
  }
  if ((await activeMemberCount(context.groupId, env)) <= 1) {
    return errorResponse('El grupo necesita al menos un integrante', 409)
  }
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE members SET active = 0, is_admin = 0 WHERE id = ?',
    ).bind(memberId),
    // Sus apodos quedan libres para otros integrantes.
    env.DB.prepare('DELETE FROM member_aliases WHERE member_id = ?').bind(
      memberId,
    ),
  ])
  await ensureAdmin(context.groupId, env)
  return json({ ok: true })
}

// Desvincula la cuenta de un integrante para que pueda volver a elegirse (por
// ejemplo, si alguien eligió al integrante equivocado).
export async function releaseMember(
  inviteCode: string,
  memberId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const context = await requireAdmin(inviteCode, request, env)
  if (context instanceof Response) {
    return context
  }
  const target = await findTarget(context.groupId, memberId, env)
  if (!target) {
    return errorResponse('Integrante no encontrado', 404)
  }
  if (target.id === context.membership.memberId) {
    return errorResponse('No puedes liberarte a ti mismo', 409)
  }
  if (!target.user_id) {
    return errorResponse('Ese integrante no fue elegido por nadie', 409)
  }
  await env.DB.prepare(
    'UPDATE members SET user_id = NULL, is_admin = 0, avatar = NULL WHERE id = ?',
  )
    .bind(memberId)
    .run()
  await ensureAdmin(context.groupId, env)
  return json({ ok: true })
}

// Da o quita el rol de administrador a un integrante. Puede haber varios
// administradores; el grupo nunca se queda sin ninguno.
export async function setMemberAdmin(
  inviteCode: string,
  memberId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const context = await requireAdmin(inviteCode, request, env)
  if (context instanceof Response) {
    return context
  }
  const fields = await readBody(request)
  if (typeof fields.admin !== 'boolean') {
    return errorResponse('Falta indicar si es administrador', 400)
  }
  const target = await findTarget(context.groupId, memberId, env)
  if (!target) {
    return errorResponse('Integrante no encontrado', 404)
  }
  if (fields.admin) {
    if (!target.user_id) {
      return errorResponse(
        'Solo puede ser administrador un integrante que ya eligió una persona',
        409,
      )
    }
  } else {
    const others = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM members
       WHERE group_id = ? AND active = 1 AND is_admin = 1 AND id <> ?`,
    )
      .bind(context.groupId, memberId)
      .first<{ total: number }>()
    if (target.is_admin === 1 && (others?.total ?? 0) === 0) {
      return errorResponse('El grupo necesita al menos un administrador', 409)
    }
  }
  await env.DB.prepare('UPDATE members SET is_admin = ? WHERE id = ?')
    .bind(fields.admin ? 1 : 0, memberId)
    .run()
  return json({ ok: true })
}

// Cambia el nombre del grupo. Solo los administradores; los demás lo ven en la
// próxima actualización.
export async function renameGroup(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const context = await requireAdmin(inviteCode, request, env)
  if (context instanceof Response) {
    return context
  }
  const fields = await readBody(request)
  if (!isNonEmptyString(fields.name, MAX_NAME_LENGTH)) {
    return errorResponse(
      `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }
  const name = fields.name.trim()
  await env.DB.prepare('UPDATE groups SET name = ? WHERE id = ?')
    .bind(name, context.groupId)
    .run()
  return json({ name })
}
