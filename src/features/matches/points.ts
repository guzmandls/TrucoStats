import type { Team } from '../counter/counterLogic'
import type { Match } from './types'

const LOW_MAX = 200
const NIVEL_DIVISOR = 1800
const NIVEL_MIN = 0.6
const NIVEL_MAX = 1.4
const MATCH_FACTOR_MIN = 0.75
const MATCH_FACTOR_MAX = 1.0
const LOSS_LOW_MIN = 0.25

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function matchFactor(match: Match): number {
  const target = match.target > 0 ? match.target : 1
  const diff = Math.abs(match.scores.nos - match.scores.ellos)
  return MATCH_FACTOR_MIN + (MATCH_FACTOR_MAX - MATCH_FACTOR_MIN) * (diff / target)
}

export function nivelFactor(winnerPoints: number, loserPoints: number): number {
  return clamp(
    1 - (winnerPoints - loserPoints) / NIVEL_DIVISOR,
    NIVEL_MIN,
    NIVEL_MAX,
  )
}

export function winBoost(points: number): number {
  const p = Math.min(Math.max(points, 0), LOW_MAX)
  return 1 + 0.8 * (1 - p / LOW_MAX)
}

export function lossFactor(points: number): number {
  const p = Math.min(Math.max(points, 0), LOW_MAX)
  return LOSS_LOW_MIN + (1 - LOSS_LOW_MIN) * Math.sqrt(p / LOW_MAX)
}

function average(points: Map<string, number>, ids: string[]): number {
  if (ids.length === 0) {
    return 0
  }
  const total = ids.reduce((sum, id) => sum + (points.get(id) ?? 0), 0)
  return total / ids.length
}

export function computePoints(
  memberIds: string[],
  matches: Match[],
): Map<string, number> {
  const points = new Map<string, number>()
  for (const id of memberIds) {
    points.set(id, 0)
  }

  const ordered = matches
    .slice()
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))

  for (const match of ordered) {
    const teamIds = (side: Team) =>
      match.teams[side]
        .map((participant) => participant.id)
        .filter((id) => points.has(id))
    const nos = teamIds('nos')
    const ellos = teamIds('ellos')
    if (nos.length === 0 || ellos.length === 0) {
      continue
    }
    const avgNos = average(points, nos)
    const avgEllos = average(points, ellos)
    const winnerAvg = match.winner === 'nos' ? avgNos : avgEllos
    const loserAvg = match.winner === 'nos' ? avgEllos : avgNos
    const factor = matchFactor(match)
    const nivel = nivelFactor(winnerAvg, loserAvg)

    for (const side of ['nos', 'ellos'] as Team[]) {
      const isWinner = match.winner === side
      for (const id of teamIds(side)) {
        const current = points.get(id) ?? 0
        if (isWinner) {
          const gain = Math.round(
            match.target * factor * nivel * winBoost(current),
          )
          points.set(id, current + gain)
        } else {
          const loss = Math.round(
            match.target * factor * nivel * lossFactor(current),
          )
          points.set(id, Math.max(0, current - loss))
        }
      }
    }
  }

  return points
}

export function computePointsDelta(
  memberIds: string[],
  matches: Match[],
  newMatch: Match,
): Map<string, number> {
  const before = computePoints(memberIds, matches)
  const after = computePoints(memberIds, [...matches, newMatch])
  const delta = new Map<string, number>()
  for (const id of memberIds) {
    const b = before.get(id) ?? 0
    const a = after.get(id) ?? 0
    delta.set(id, a - b)
  }
  return delta
}
