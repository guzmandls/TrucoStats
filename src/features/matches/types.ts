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
}
