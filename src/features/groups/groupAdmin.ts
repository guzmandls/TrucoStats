import type { Group } from './types'

// Si la persona de este celular es administradora del grupo.
export function isGroupAdmin(group: Group): boolean {
  return (
    group.myMemberId !== undefined &&
    group.adminMemberIds.includes(group.myMemberId)
  )
}

// Genera el id de un integrante nuevo.
export function newMemberId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}
