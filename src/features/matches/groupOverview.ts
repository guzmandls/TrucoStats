import type { Group, Member } from '../groups/types'
import { dayLabel } from './dayLabel'
import { participantNames } from './format'
import { podium, sideOf } from './groupStats'
import { computePoints } from './points'
import { activeMatches } from './status'
import type { Match } from './types'

export interface GroupOverview {
  // Integrantes por posición en el ranking (los que jugaron, de mayor a menor
  // puntaje) y después los que todavía no jugaron, en su orden original.
  ranking: Member[]
  // Lugar de la persona de este celular en el ranking (null si no jugó o no se
  // sabe quién es).
  position: number | null
  // Sus puntos (null si no se sabe quién es).
  points: number | null
  memberCount: number
  // Partidas que cuentan (sin las canceladas).
  matchCount: number
  // La última partida que cuenta.
  last: Match | null
}

export function groupOverview(group: Group, matches: Match[]): GroupOverview {
  const active = activeMatches(matches).filter(
    (match) => match.groupId === group.id,
  )
  const ranked = podium(group, active, group.members.length)
  const byId = new Map(group.members.map((member) => [member.id, member]))
  const rankedMembers = ranked
    .map((entry) => byId.get(entry.stat.id))
    .filter((member): member is Member => member !== undefined)
  const rankedIds = new Set(rankedMembers.map((member) => member.id))
  const me = group.myMemberId
  const mine = me ? ranked.find((entry) => entry.stat.id === me) : undefined
  const points = me
    ? (computePoints(
        group.members.map((member) => member.id),
        active,
      ).get(me) ?? 0)
    : null
  const last = active.reduce<Match | null>(
    (latest, match) =>
      latest === null || match.playedAt > latest.playedAt ? match : latest,
    null,
  )
  return {
    ranking: [
      ...rankedMembers,
      ...group.members.filter((member) => !rankedIds.has(member.id)),
    ],
    position: mine?.place ?? null,
    points,
    memberCount: group.members.length,
    matchCount: active.length,
    last,
  }
}

// "ganaste 30 – 21 · hoy" si la persona jugó; si no, quién ganó:
// "ganó Pedro 30 – 21 · ayer". La palabra "Última" la pone la pantalla.
export function lastMatchText(
  match: Match,
  myMemberId: string | undefined,
  now: Date = new Date(),
): string {
  const when = dayLabel(match.playedAt, now).toLowerCase()
  const mySide = myMemberId ? sideOf(match, myMemberId) : null
  if (mySide) {
    const other = mySide === 'nos' ? 'ellos' : 'nos'
    const verb = match.winner === mySide ? 'ganaste' : 'perdiste'
    return `${verb} ${match.scores[mySide]} – ${match.scores[other]} · ${when}`
  }
  const loser = match.winner === 'nos' ? 'ellos' : 'nos'
  const winners = match.teams[match.winner]
  const verb = winners.length === 1 ? 'ganó' : 'ganaron'
  return `${verb} ${participantNames(winners) ?? ''} ${match.scores[match.winner]} – ${match.scores[loser]} · ${when}`
}
