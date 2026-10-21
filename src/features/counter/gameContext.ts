import type { Team } from './counterLogic'
import type { MatchType, Modality, Participant } from '../matches/types'

export interface GameContext {
  type: MatchType
  groupId: string | null
  teams: Record<Team, Participant[]>
  modality: Modality | null
  // Identifica esta partida cuando se transmite en vivo (puede haber varias a la
  // vez en un grupo). Se crea al armar la partida.
  liveId?: string
}

export function quickContext(): GameContext {
  return {
    type: 'quick',
    groupId: null,
    teams: { nos: [], ellos: [] },
    modality: null,
  }
}

export function isGameContext(value: unknown): value is GameContext {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const context = value as Record<string, unknown>
  if (context.type !== 'quick' && context.type !== 'group') {
    return false
  }
  if (context.groupId !== null && typeof context.groupId !== 'string') {
    return false
  }
  if (context.liveId !== undefined && typeof context.liveId !== 'string') {
    return false
  }
  if (
    context.modality !== null &&
    !['1v1', '2v2', '3v3'].includes(context.modality as string)
  ) {
    return false
  }
  if (
    typeof context.teams !== 'object' ||
    context.teams === null ||
    Array.isArray(context.teams)
  ) {
    return false
  }
  const teams = context.teams as Record<string, unknown>
  return isTeamParticipants(teams.nos) && isTeamParticipants(teams.ellos)
}

function isTeamParticipants(value: unknown): boolean {
  return Array.isArray(value) && value.every(isParticipant)
}

function isParticipant(value: unknown): value is Participant {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const participant = value as Record<string, unknown>
  return (
    typeof participant.id === 'string' &&
    typeof participant.name === 'string' &&
    (participant.guest === undefined || participant.guest === true)
  )
}
