import type { Match } from './types'

export interface TypeSummary {
  total: number
  wins: number
  losses: number
  winRate: number | null
}

export interface PersonalSummary {
  total: number
  wins: number
  losses: number
  winRate: number | null
  averageDurationSeconds: number | null
  quick: TypeSummary
  group: TypeSummary
}

function summarize(matches: Match[]): TypeSummary {
  const total = matches.length
  const wins = matches.filter((match) => match.winner === 'nos').length
  return {
    total,
    wins,
    losses: total - wins,
    winRate: total === 0 ? null : Math.round((wins / total) * 100),
  }
}

export function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds))
  if (rounded < 60) {
    return `${rounded} s`
  }
  return `${Math.round(rounded / 60)} min`
}

export function personalSummary(matches: Match[]): PersonalSummary {
  const durations = matches
    .map((match) => match.durationSeconds)
    .filter((duration): duration is number => duration !== null)
  const averageDurationSeconds =
    durations.length === 0
      ? null
      : Math.round(
          durations.reduce((total, duration) => total + duration, 0) /
            durations.length,
        )

  return {
    ...summarize(matches),
    averageDurationSeconds,
    quick: summarize(matches.filter((match) => match.type === 'quick')),
    group: summarize(matches.filter((match) => match.type === 'group')),
  }
}
