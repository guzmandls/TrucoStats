import type { Match } from './types'

export function isCanceled(match: Match): boolean {
  return match.canceled !== undefined
}

// Las partidas que cuentan para puntos y estadísticas.
export function activeMatches(matches: Match[]): Match[] {
  return matches.filter((match) => !isCanceled(match))
}
