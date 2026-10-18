import { GROUPS_STORE, put, readAll, remove } from '../../lib/db'
import type { Group, Member } from './types'

function isMember(value: unknown): value is Member {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const member = value as Record<string, unknown>
  return typeof member.id === 'string' && typeof member.name === 'string'
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
