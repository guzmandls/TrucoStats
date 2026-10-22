import {
  apiRequest,
  deleteRequest,
  getVersioned,
  patchJson,
  postJson,
  putJson,
} from '../../lib/api'
import { saveSession, type Account } from '../../lib/session'
import type { Match } from '../matches/types'
import type { Group } from './types'

interface RegisterResponse {
  inviteCode: string
}

// Registra el grupo en el servidor y devuelve su código de invitación.
export async function registerGroup(group: Group): Promise<string> {
  const { id, name, adminMemberIds, createdAt, members } = group
  const response = await postJson<RegisterResponse>('/api/grupos', {
    id,
    name,
    adminMemberId: adminMemberIds[0],
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
  const response = await getVersioned<GroupResponse>(
    `/api/grupos/${inviteCode}`,
  )
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
    // Avisa que se canceló mientras se contaba (puede estar empatada).
    ...(match.canceled ? { canceled: true } : {}),
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

// --- Administración del grupo (solo para administradores) ---

// Agrega un integrante nuevo.
export async function addRemoteMember(
  inviteCode: string,
  member: { id: string; name: string },
): Promise<void> {
  await postJson(`/api/grupos/${inviteCode}/integrantes`, member)
}

// Da de baja a un integrante (sus partidas se conservan).
export async function removeRemoteMember(
  inviteCode: string,
  memberId: string,
): Promise<void> {
  await deleteRequest(`/api/grupos/${inviteCode}/integrantes/${memberId}`)
}

// Desvincula a la persona que eligió ese integrante, para que pueda elegir de
// nuevo.
export async function releaseRemoteMember(
  inviteCode: string,
  memberId: string,
): Promise<void> {
  await postJson(
    `/api/grupos/${inviteCode}/integrantes/${memberId}/liberar`,
    {},
  )
}

// Da o quita el rol de administrador.
export async function setRemoteMemberAdmin(
  inviteCode: string,
  memberId: string,
  admin: boolean,
): Promise<void> {
  await putJson(
    `/api/grupos/${inviteCode}/integrantes/${memberId}/administrador`,
    { admin },
  )
}

// Un grupo creado antes de las cuentas no tiene a nadie vinculado: quien lo creó
// reclama su integrante y pasa a ser administrador.
export async function claimRemoteMember(
  inviteCode: string,
  memberId: string,
): Promise<void> {
  await postJson(`/api/grupos/${inviteCode}/reclamar`, { memberId })
}

// Cambia el nombre de un integrante (también en las partidas ya guardadas).
export async function renameRemoteMember(
  inviteCode: string,
  memberId: string,
  name: string,
): Promise<void> {
  await patchJson(`/api/grupos/${inviteCode}/integrantes/${memberId}`, {
    name,
  })
}

// Cambia el nombre del grupo (solo administradores).
export async function renameRemoteGroup(
  inviteCode: string,
  name: string,
): Promise<string> {
  const response = await patchJson<{ name: string }>(
    `/api/grupos/${inviteCode}`,
    { name },
  )
  return response.name
}

// Cambia los apodos de un integrante (reemplaza la lista completa).
export async function setRemoteAliases(
  inviteCode: string,
  memberId: string,
  aliases: string[],
): Promise<void> {
  await putJson(`/api/grupos/${inviteCode}/integrantes/${memberId}/apodos`, {
    aliases,
  })
}

export interface MatchEvent {
  action: 'register' | 'cancel' | 'restore'
  // Nombre del integrante que lo hizo (null si no se sabe).
  by: string | null
  reason: string | null
  at: string
}

// Trae del servidor todo lo que pasó con una partida: cuándo se registró y cada
// cancelación o restauración.
export async function fetchMatchHistory(
  inviteCode: string,
  matchId: string,
): Promise<MatchEvent[]> {
  const response = await apiRequest<{ events: MatchEvent[] }>(
    `/api/grupos/${inviteCode}/partidas/${matchId}/historial`,
  )
  return response.events
}

// Avisa al servidor que la persona sale del grupo: su integrante queda libre y,
// si era administrador, el rol pasa a otro.
export async function leaveRemoteGroup(inviteCode: string): Promise<void> {
  await postJson(`/api/grupos/${inviteCode}/salir`, {})
}

interface MatchesResponse {
  matches: Match[]
}

// Trae todas las partidas del grupo que hay en el servidor.
export async function fetchRemoteMatches(inviteCode: string): Promise<Match[]> {
  const response = await getVersioned<MatchesResponse>(
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
