import { errorResponse, json } from './http'

export interface Env {
  DB: D1Database
}

interface MemberInput {
  id: string
  name: string
  avatar?: string
}

interface GroupInput {
  id: string
  name: string
  adminMemberId: string
  createdAt: string
  members: MemberInput[]
}

export const MAX_NAME_LENGTH = 20
const MAX_MEMBERS = 50
export const MAX_AVATAR_LENGTH = 200_000
const MAX_ID_LENGTH = 100

export function isNonEmptyString(
  value: unknown,
  maxLength: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function parseMember(value: unknown): MemberInput | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const member = value as Record<string, unknown>
  if (
    !isNonEmptyString(member.id, MAX_ID_LENGTH) ||
    !isNonEmptyString(member.name, MAX_NAME_LENGTH)
  ) {
    return null
  }
  if (member.avatar === undefined) {
    return { id: member.id, name: member.name.trim() }
  }
  if (!isNonEmptyString(member.avatar, MAX_AVATAR_LENGTH)) {
    return null
  }
  return { id: member.id, name: member.name.trim(), avatar: member.avatar }
}

// Valida lo que envía la app. Devuelve el grupo limpio o un mensaje de error.
export function parseGroup(
  body: unknown,
  now: () => string,
): GroupInput | string {
  if (typeof body !== 'object' || body === null) {
    return 'El cuerpo debe ser un objeto JSON'
  }
  const data = body as Record<string, unknown>
  if (!isNonEmptyString(data.id, MAX_ID_LENGTH)) {
    return 'Falta el id del grupo'
  }
  if (!isNonEmptyString(data.name, MAX_NAME_LENGTH)) {
    return `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`
  }
  if (!Array.isArray(data.members) || data.members.length === 0) {
    return 'El grupo necesita al menos un integrante'
  }
  if (data.members.length > MAX_MEMBERS) {
    return `El grupo admite hasta ${MAX_MEMBERS} integrantes`
  }
  const members: MemberInput[] = []
  for (const raw of data.members) {
    const member = parseMember(raw)
    if (!member) {
      return 'Cada integrante necesita un id y un nombre válidos'
    }
    members.push(member)
  }
  if (new Set(members.map((member) => member.id)).size !== members.length) {
    return 'Los integrantes no pueden repetir id'
  }
  if (
    typeof data.adminMemberId !== 'string' ||
    !members.some((member) => member.id === data.adminMemberId)
  ) {
    return 'El administrador debe ser uno de los integrantes'
  }
  return {
    id: data.id,
    name: data.name.trim(),
    adminMemberId: data.adminMemberId,
    createdAt: isNonEmptyString(data.createdAt, 40) ? data.createdAt : now(),
    members,
  }
}

// 128 bits aleatorios en hexadecimal: imposible de adivinar.
export function createInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

interface GroupRow {
  id: string
  name: string
  admin_member_id: string
  created_at: string
  invite_code: string
}

interface MemberRow {
  id: string
  name: string
  avatar: string | null
}

function groupResponse(group: GroupRow, members: MemberRow[]) {
  return {
    group: {
      id: group.id,
      name: group.name,
      adminMemberId: group.admin_member_id,
      createdAt: group.created_at,
      members: members.map((member) =>
        member.avatar === null
          ? { id: member.id, name: member.name }
          : { id: member.id, name: member.name, avatar: member.avatar },
      ),
    },
    inviteCode: group.invite_code,
  }
}

export async function createGroup(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }

  const group = parseGroup(body, () => new Date().toISOString())
  if (typeof group === 'string') {
    return errorResponse(group, 400)
  }

  const inviteCode = createInviteCode()
  const statements = [
    env.DB.prepare(
      'INSERT INTO groups (id, name, admin_member_id, created_at, invite_code) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      group.id,
      group.name,
      group.adminMemberId,
      group.createdAt,
      inviteCode,
    ),
    ...group.members.map((member) =>
      env.DB.prepare(
        'INSERT INTO members (id, group_id, name, avatar) VALUES (?, ?, ?, ?)',
      ).bind(member.id, group.id, member.name, member.avatar ?? null),
    ),
  ]

  try {
    // batch ejecuta todo junto: o se guarda el grupo completo o nada.
    await env.DB.batch(statements)
  } catch {
    return errorResponse('Ya existe un grupo o integrante con ese id', 409)
  }

  return json(
    groupResponse(
      {
        id: group.id,
        name: group.name,
        admin_member_id: group.adminMemberId,
        created_at: group.createdAt,
        invite_code: inviteCode,
      },
      group.members.map((member) => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar ?? null,
      })),
    ),
    201,
  )
}

export async function getGroupByInviteCode(
  inviteCode: string,
  env: Env,
): Promise<Response> {
  const group = await env.DB.prepare(
    'SELECT id, name, admin_member_id, created_at, invite_code FROM groups WHERE invite_code = ?',
  )
    .bind(inviteCode)
    .first<GroupRow>()
  if (!group) {
    return errorResponse('Grupo no encontrado', 404)
  }

  const { results } = await env.DB.prepare(
    'SELECT id, name, avatar FROM members WHERE group_id = ? AND active = 1 ORDER BY rowid',
  )
    .bind(group.id)
    .all<MemberRow>()

  return json(groupResponse(group, results))
}
