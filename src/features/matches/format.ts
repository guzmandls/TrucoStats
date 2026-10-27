import { shortDate } from './dayLabel'
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
  return shortDate(match.playedAt)
}

// Datos de la partida en líneas cortas para el bloque lateral del historial:
// ["3v3", "40 pts", "10 min"].
export function matchMetaParts(match: Match): string[] {
  const parts = [match.modality, `${match.target} pts`]
  if (match.durationSeconds !== null) {
    parts.push(`${Math.round(match.durationSeconds / 60)} min`)
  }
  return parts.filter((part): part is string => part !== null)
}

// Duración en minutos para la línea de datos de una partida: "26 min" (null si
// no se registró).
export function matchDurationLabel(match: Match): string | null {
  return match.durationSeconds === null
    ? null
    : `${Math.round(match.durationSeconds / 60)} min`
}

// Hora de la partida en el celular: "21:05".
export function matchTime(match: Match): string {
  const date = new Date(match.playedAt)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// Con `includeDate` en false se omite la fecha (el historial ya la muestra en el
// título del día).
export function matchMeta(match: Match, includeDate = true): string {
  const details = [
    match.modality ?? null,
    `${match.target} puntos`,
    includeDate ? matchDate(match) : null,
  ]
  if (match.durationSeconds !== null) {
    details.push(`${Math.round(match.durationSeconds / 60)} min`)
  }
  return details.filter((detail) => detail !== null).join(' · ')
}
