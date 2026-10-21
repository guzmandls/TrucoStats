import { GROUPS_STORE, put, readAll, remove } from '../../lib/db'
import { loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Group, Member } from './types'

function isMember(value: unknown): value is Member {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const member = value as Record<string, unknown>
  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string' &&
    (member.avatar === undefined || typeof member.avatar === 'string')
  )
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string')
}

function isGroup(value: unknown): value is Group {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const group = value as Record<string, unknown>
  return (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    (isIdList(group.adminMemberIds) ||
      typeof group.adminMemberId === 'string') &&
    typeof group.createdAt === 'string' &&
    (group.inviteCode === undefined || typeof group.inviteCode === 'string') &&
    (group.myMemberId === undefined || typeof group.myMemberId === 'string') &&
    Array.isArray(group.members) &&
    group.members.every(isMember)
  )
}

export async function loadGroups(): Promise<Group[]> {
  const groups = await readAll<unknown>(GROUPS_STORE)
  // Los grupos guardados antes de existir varios administradores tienen un solo
  // `adminMemberId`; se convierten al formato nuevo al leerlos.
  return groups.filter(isGroup).map((group) => {
    const { adminMemberId, ...rest } = group as Group & {
      adminMemberId?: string
    }
    const adminMemberIds = isIdList(group.adminMemberIds)
      ? group.adminMemberIds
      : adminMemberId
        ? [adminMemberId]
        : []
    return {
      ...rest,
      adminMemberIds,
      // Un grupo creado en este celular antes de las cuentas y que todavía no está
      // en el servidor es de quien lo creó: esa persona es su administrador. Así
      // aparece como integrante (puntos, ranking) y, al invitar, el servidor la
      // vincula como administradora.
      ...(group.myMemberId === undefined &&
      group.inviteCode === undefined &&
      adminMemberIds[0]
        ? { myMemberId: adminMemberIds[0] }
        : {}),
    }
  })
}

export function saveGroup(group: Group): Promise<void> {
  return put(GROUPS_STORE, group)
}

// Cambia el nombre de un integrante en el grupo y en las partidas ya guardadas.
export async function renameMember(
  groupId: string,
  memberId: string,
  name: string,
): Promise<Group | null> {
  const current = (await loadGroups()).find((group) => group.id === groupId)
  if (!current) {
    return null
  }
  const updated: Group = {
    ...current,
    members: current.members.map((member) =>
      member.id === memberId ? { ...member, name } : member,
    ),
  }
  await saveGroup(updated)
  for (const match of await loadMatches()) {
    const sides = [...match.teams.nos, ...match.teams.ellos]
    if (sides.some((player) => player.id === memberId)) {
      const rename = (team: typeof match.teams.nos) =>
        team.map((player) =>
          player.id === memberId ? { ...player, name } : player,
        )
      await saveMatch({
        ...match,
        teams: {
          nos: rename(match.teams.nos),
          ellos: rename(match.teams.ellos),
        },
      })
    }
  }
  return updated
}

// Guarda el código de invitación sobre la versión más reciente del grupo.
export async function setGroupInviteCode(
  groupId: string,
  inviteCode: string,
): Promise<Group | null> {
  const current = (await loadGroups()).find((group) => group.id === groupId)
  if (!current) {
    return null
  }
  const updated: Group = { ...current, inviteCode }
  await saveGroup(updated)
  return updated
}

export function deleteGroup(id: string): Promise<void> {
  return remove(GROUPS_STORE, id)
}

export async function updateMemberAvatar(
  group: Group,
  memberId: string,
  avatar: string | undefined,
): Promise<Group> {
  const members = group.members.map((member) =>
    member.id === memberId ? { ...member, avatar } : member,
  )
  const updated: Group = { ...group, members }
  await saveGroup(updated)
  return updated
}

/**
 * Saca el grupo de este celular al salir. El grupo deja de estar guardado aquí
 * (si se vuelve a entrar con el enlace se vuelve a elegir quién eres); en el
 * servidor, el integrante queda libre y el rol de administrador pasa a otro si hace
 * falta (eso se avisa antes, desde la pantalla del grupo). Las partidas ya jugadas
 * no se borran, para que sigan contando en el perfil personal. Devuelve 'deleted'
 * si la persona era el único integrante (el grupo deja de existir) y 'left' si no.
 */
export async function leaveGroup(group: Group): Promise<'left' | 'deleted'> {
  await deleteGroup(group.id)
  return group.members.length <= 1 ? 'deleted' : 'left'
}
