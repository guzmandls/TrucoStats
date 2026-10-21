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
  state: LiveState
  startedAt: string
  updatedAt: string
}

// El contador publica (o actualiza) la partida en curso del grupo.
export async function publishLive(
  inviteCode: string,
  state: LiveState,
): Promise<void> {
  await putJson(`/api/grupos/${inviteCode}/en-vivo`, { state })
}

// La partida terminó o se cerró el contador.
export async function stopLive(inviteCode: string): Promise<void> {
  await deleteRequest(`/api/grupos/${inviteCode}/en-vivo`)
}

// La partida en vivo del grupo (null si no hay ninguna).
export async function fetchLive(inviteCode: string): Promise<LiveMatch | null> {
  const response = await apiRequest<{ live: LiveMatch | null }>(
    `/api/grupos/${inviteCode}/en-vivo`,
  )
  return response.live
}
