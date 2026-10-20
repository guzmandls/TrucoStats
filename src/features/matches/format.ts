import type { Match, Participant } from './types'

export function participantNames(participants: Participant[]): string | null {
  const names = participants.map((participant) => participant.name)
  if (names.length === 0) {
    return null
  }
  if (names.length === 1) {
    return names[0]
  }
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

export function matchScore(match: Match): string {
  return `${match.scores.nos} – ${match.scores.ellos}`
}

export function matchTitle(match: Match): string {
  if (match.type === 'quick') {
    return `Partida rápida ${matchScore(match)}`
  }
  const nos = participantNames(match.teams.nos)
  const ellos = participantNames(match.teams.ellos)
  if (!nos || !ellos) {
    return `Partida de grupo ${matchScore(match)}`
  }
  return `${nos} ${matchScore(match)} ${ellos}`
}

export function matchMeta(match: Match): string {
  const details = [
    match.modality ?? null,
    `${match.target} puntos`,
    new Date(match.playedAt).toLocaleDateString('es-UY'),
  ]
  if (match.durationSeconds !== null) {
    details.push(`${Math.round(match.durationSeconds / 60)} min`)
  }
  return details.filter((detail) => detail !== null).join(' · ')
}
