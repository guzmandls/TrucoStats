import type { Match, Participant } from './types'

export function joinNames(names: string[]): string {
  return names.join(' - ')
}

export function participantNames(participants: Participant[]): string | null {
  if (participants.length === 0) {
    return null
  }
  return joinNames(participants.map((participant) => participant.name))
}

export function scoreDifferenceLabel(match: Match): string {
  const difference = Math.abs(match.scores.nos - match.scores.ellos)
  return `${difference} ${difference === 1 ? 'punto' : 'puntos'}`
}

export function matchScore(match: Match): string {
  return `${match.scores.nos} – ${match.scores.ellos}`
}

export function matchDate(match: Match): string {
  return new Date(match.playedAt).toLocaleDateString('es-UY')
}

export function matchMeta(match: Match): string {
  const details = [
    match.modality ?? null,
    `${match.target} puntos`,
    matchDate(match),
  ]
  if (match.durationSeconds !== null) {
    details.push(`${Math.round(match.durationSeconds / 60)} min`)
  }
  return details.filter((detail) => detail !== null).join(' · ')
}
