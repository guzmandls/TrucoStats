import type { Team } from '../counter/counterLogic'

export type MatchType = 'quick' | 'group'

export type Modality = '1v1' | '2v2' | '3v3'

export interface Participant {
  id: string
  name: string
}

export interface Match {
  id: string
  type: MatchType
  groupId: string | null
  modality: Modality | null
  playedAt: string
  durationSeconds: number | null
  target: number
  winner: Team
  teams: Record<Team, Participant[]>
  scores: Record<Team, number>
  // Cuándo confirmó el servidor la partida. Solo en este celular: si falta,
  // la partida de grupo está pendiente de enviar.
  syncedAt?: string
  // Integrante que registró la partida (lo informa el servidor).
  createdBy?: string
  // Cuándo recibió el servidor la partida (desde ahí corre el plazo de quien
  // la registró para cancelarla).
  registeredAt?: string
  // Presente solo si la partida fue cancelada: no cuenta para puntos ni
  // estadísticas, pero sigue en el historial.
  canceled?: Cancellation
}

export interface Cancellation {
  at: string
  // Integrante que la canceló.
  by: string | null
  reason: string | null
}
