import { MATCHES_STORE, put, readAll, remove } from '../../lib/db'
import type { Match, MatchType, Modality, Participant } from './types'

const MATCH_TYPES: MatchType[] = ['quick', 'group']
const MODALITIES: Modality[] = ['1v1', '2v2', '3v3']

function isParticipant(value: unknown): value is Participant {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const participant = value as Record<string, unknown>
  return (
    typeof participant.id === 'string' && typeof participant.name === 'string'
  )
}

function isTeamParticipants(value: unknown): boolean {
  return Array.isArray(value) && value.every(isParticipant)
}

function isTeams(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const teams = value as Record<string, unknown>
  return isTeamParticipants(teams.nos) && isTeamParticipants(teams.ellos)
}

function isScores(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const scores = value as Record<string, unknown>
  return typeof scores.nos === 'number' && typeof scores.ellos === 'number'
}

function isMatch(value: unknown): value is Match {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const match = value as Record<string, unknown>
  return (
    typeof match.id === 'string' &&
    MATCH_TYPES.includes(match.type as MatchType) &&
    (match.groupId === null || typeof match.groupId === 'string') &&
    (match.modality === null ||
      MODALITIES.includes(match.modality as Modality)) &&
    typeof match.playedAt === 'string' &&
    (match.durationSeconds === null ||
      typeof match.durationSeconds === 'number') &&
    typeof match.target === 'number' &&
    (match.winner === 'nos' || match.winner === 'ellos') &&
    isTeams(match.teams) &&
    isScores(match.scores)
  )
}

export async function loadMatchesByGroupId(groupId: string): Promise<Match[]> {
  const matches = await loadMatches()
  return matches.filter((match) => match.groupId === groupId)
}

export async function loadMatches(): Promise<Match[]> {
  const matches = await readAll<unknown>(MATCHES_STORE)
  return matches.filter(isMatch)
}

export function saveMatch(match: Match): Promise<void> {
  return put(MATCHES_STORE, match)
}

export function deleteMatch(id: string): Promise<void> {
  return remove(MATCHES_STORE, id)
}
