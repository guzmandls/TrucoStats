import { apiRequest, patchJson, postJson } from '../../lib/api'
import { saveSession, type Account } from '../../lib/session'
import type { Match } from '../matches/types'
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
  claimedMemberIds?: string[]
  myMemberId?: string | null
}

export interface RemoteGroup {
  group: Group
  // Integrantes que ya eligió alguien.
  claimedMemberIds: string[]
  // Cuál integrante es la persona con la sesión iniciada (null si ninguno).
  myMemberId: string | null
}

// Trae del servidor el grupo al que corresponde el código de invitación.
export async function fetchGroupByCode(
  inviteCode: string,
): Promise<RemoteGroup> {
  const response = await apiRequest<GroupResponse>(`/api/grupos/${inviteCode}`)
  return {
    group: { ...response.group, inviteCode: response.inviteCode },
    claimedMemberIds: response.claimedMemberIds ?? [],
    myMemberId: response.myMemberId ?? null,
  }
}

interface JoinResponse {
  user: Account
  token?: string
  memberId: string
}

// Elige un integrante del grupo (con el nombre que la persona quiere usar). Si
// todavía no tenía sesión, el servidor le crea una cuenta invitada y la app
// guarda su token.
export async function joinRemoteGroup(
  inviteCode: string,
  memberId: string,
  name: string,
): Promise<void> {
  const response = await postJson<JoinResponse>(
    `/api/grupos/${inviteCode}/unirse`,
    { memberId, name },
  )
  if (response.token) {
    saveSession({ token: response.token, user: response.user })
  }
}

// Envía una partida de grupo. Es idempotente: reenviarla no la duplica.
export async function sendMatch(
  inviteCode: string,
  match: Match,
): Promise<void> {
  await postJson(`/api/grupos/${inviteCode}/partidas`, {
    id: match.id,
    type: match.type,
    modality: match.modality,
    playedAt: match.playedAt,
    durationSeconds: match.durationSeconds,
    target: match.target,
    winner: match.winner,
    teams: match.teams,
    scores: match.scores,
  })
}

// Sube o quita (null) la foto de un integrante.
export async function setRemoteAvatar(
  inviteCode: string,
  memberId: string,
  avatar: string | null,
): Promise<void> {
  await patchJson(`/api/grupos/${inviteCode}/integrantes/${memberId}`, {
    avatar,
  })
}

interface MatchesResponse {
  matches: Match[]
}

// Trae todas las partidas del grupo que hay en el servidor.
export async function fetchRemoteMatches(inviteCode: string): Promise<Match[]> {
  const response = await apiRequest<MatchesResponse>(
    `/api/grupos/${inviteCode}/partidas`,
  )
  return response.matches
}

// Cancela una partida en el servidor (con un motivo opcional) y devuelve cómo
// quedó.
export async function cancelRemoteMatch(
  inviteCode: string,
  matchId: string,
  reason: string,
): Promise<Match> {
  const response = await postJson<{ match: Match }>(
    `/api/grupos/${inviteCode}/partidas/${matchId}/cancelar`,
    { reason: reason.trim() === '' ? undefined : reason.trim() },
  )
  return response.match
}

export async function restoreRemoteMatch(
  inviteCode: string,
  matchId: string,
): Promise<Match> {
  const response = await postJson<{ match: Match }>(
    `/api/grupos/${inviteCode}/partidas/${matchId}/restaurar`,
    {},
  )
  return response.match
}

export function inviteLink(inviteCode: string): string {
  return `${window.location.origin}/unirse/${inviteCode}`
}
