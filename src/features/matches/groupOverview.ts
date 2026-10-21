import type { Group, Member } from '../groups/types'
import { dayLabel } from './dayLabel'
import { forStats } from './guests'
import { podium } from './groupStats'
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
  const active = forStats(
    group,
    activeMatches(matches).filter((match) => match.groupId === group.id),
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

// Cuándo fue la partida: "hoy 21:05", "ayer 18:30", "18 oct 21:00" (con el año si
// es de otro año). La hora es la del celular.
export function matchWhen(match: Match, now: Date = new Date()): string {
  return whenLabel(match.playedAt, now)
}

// Lo mismo para cualquier fecha ISO (por ejemplo, la de un evento de la partida).
export function whenLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${dayLabel(iso, now).toLowerCase()} ${time}`
}
