import { GROUPS_STORE, put, readAll, remove } from '../../lib/db'
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

function isGroup(value: unknown): value is Group {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const group = value as Record<string, unknown>
  return (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.adminMemberId === 'string' &&
    typeof group.createdAt === 'string' &&
    Array.isArray(group.members) &&
    group.members.every(isMember)
  )
}

export async function loadGroups(): Promise<Group[]> {
  const groups = await readAll<unknown>(GROUPS_STORE)
  return groups.filter(isGroup)
}

export function saveGroup(group: Group): Promise<void> {
  return put(GROUPS_STORE, group)
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
 * Saca al usuario actual del grupo. Como todavía no existe el vínculo
 * usuario↔integrante se asume que este dispositivo es el administrador: si
 * quedan otros integrantes se transfiere la administración y el grupo se
 * conserva (con las partidas intactas); si el admin era el único integrante se
 * borra el grupo. Las partidas ya jugadas no se borran para que sigan contando
 * en el perfil personal.
 */
export async function leaveGroup(group: Group): Promise<'left' | 'deleted'> {
  const others = group.members.filter(
    (member) => member.id !== group.adminMemberId,
  )
  if (others.length === 0) {
    await deleteGroup(group.id)
    return 'deleted'
  }
  await saveGroup({ ...group, adminMemberId: others[0].id })
  return 'left'
}
