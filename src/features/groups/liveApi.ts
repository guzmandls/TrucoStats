import { apiRequest, deleteRequest, putJson } from '../../lib/api'
import type { Team } from '../counter/counterLogic'
import type { Participant } from '../matches/types'

// Cómo va una partida de grupo, tal como la publica el contador para que los
// demás integrantes la miren.
export interface LiveState {
  teams: Record<Team, Participant[]>
  target: number
  scores: Record<Team, number>
  paused: boolean
  // Segundos de juego en el momento de publicar (sin contar pausas).
  elapsedSeconds: number
  // Equipo que ya llegó al objetivo, a la espera de confirmar el resultado.
  winner: Team | null
}

export interface LiveMatch {
  // Identifica la partida (puede haber varias en vivo a la vez en un grupo).
  id: string
  state: LiveState
  startedAt: string
  updatedAt: string
}

// El contador publica (o actualiza) la partida en curso del grupo.
export async function publishLive(
  inviteCode: string,
  liveId: string,
  state: LiveState,
): Promise<void> {
  await putJson(`/api/grupos/${inviteCode}/en-vivo/${liveId}`, { state })
}

// La partida terminó o se cerró el contador.
export async function stopLive(
  inviteCode: string,
  liveId: string,
): Promise<void> {
  await deleteRequest(`/api/grupos/${inviteCode}/en-vivo/${liveId}`)
}

// Las partidas en vivo del grupo (vacío si no hay ninguna).
export async function fetchLive(inviteCode: string): Promise<LiveMatch[]> {
  const response = await apiRequest<{ live: LiveMatch[] }>(
    `/api/grupos/${inviteCode}/en-vivo`,
  )
  return response.live
}
