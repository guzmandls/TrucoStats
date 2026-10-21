import { apiRequest, patchJson, postJson } from '../../lib/api'
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

interface GroupResponse {
  group: Group
  inviteCode: string
}

// Trae del servidor el grupo al que corresponde el código de invitación.
export async function fetchGroupByCode(inviteCode: string): Promise<Group> {
  const response = await apiRequest<GroupResponse>(`/api/grupos/${inviteCode}`)
  return { ...response.group, inviteCode: response.inviteCode }
}

export async function renameRemoteMember(
  inviteCode: string,
  memberId: string,
  name: string,
): Promise<void> {
  await patchJson(`/api/grupos/${inviteCode}/integrantes/${memberId}`, { name })
}

export function inviteLink(inviteCode: string): string {
  return `${window.location.origin}/unirse/${inviteCode}`
}
