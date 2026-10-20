import { postJson } from '../../lib/api'
import type { Group } from './types'

interface RegisterResponse {
  inviteCode: string
}

// Registra el grupo en el servidor y devuelve su código de invitación.
export async function registerGroup(group: Group): Promise<string> {
  const { id, name, adminMemberId, createdAt, members } = group
  const response = await postJson<RegisterResponse>('/api/grupos', {
    id,
    name,
    adminMemberId,
    createdAt,
    members,
  })
  return response.inviteCode
}

export function inviteLink(inviteCode: string): string {
  return `${window.location.origin}/unirse/${inviteCode}`
}
