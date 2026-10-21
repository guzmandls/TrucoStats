import type { Group, Member } from '../groups/types'
import type { Match, Participant } from './types'
import { computePoints } from './points'

const MIN_GAMES = 3
// Una racha son al menos dos resultados seguidos iguales.
const MIN_STREAK = 2

type Side = 'nos' | 'ellos'

export interface MemberStats {
  id: string
  name: string
  played: number
  wins: number
  losses: number
  winRate: number | null
  averageDurationSeconds: number | null
  bestVictim: Participant | null
  toughestRival: Participant | null
  bestPartner: Participant | null
  worstPartner: Participant | null
  longestWinStreak: number
  longestLossStreak: number
  currentWinStreak: number
  currentLossStreak: number
  points: number
}

export interface TeamStat {
  ids: string[]
  names: string[]
  winRate: number
  games: number
}

export interface StreakRecord {
  members: Participant[]
  count: number
}

export interface Rivalry {
  members: [Participant, Participant]
  played: number
  wins: [number, number]
}

export interface GroupSummary {
  totalMatches: number
  averageDurationSeconds: number | null
  longestMatch: Match | null
  shortestMatch: Match | null
  closestMatch: Match | null
  biggestBlowout: Match | null
  longestWinStreak: StreakRecord | null
  longestLossStreak: StreakRecord | null
  activeWinStreak: StreakRecord | null
  activeLossStreak: StreakRecord | null
  topRivalry: Rivalry | null
  mostWins: MemberStats | null
  bestWinRate: MemberStats | null
  mostLosses: MemberStats | null
  worstWinRate: MemberStats | null
  mostPlayed: MemberStats | null
  bestPair: TeamStat | null
  worstPair: TeamStat | null
  bestTrio: TeamStat | null
  worstTrio: TeamStat | null
}

export interface HeadToHead {
  a: MemberStats
  b: MemberStats
  played: number
  aWins: number
  bWins: number
  aWinRate: number
  bWinRate: number
}

interface Tally {
  id: string
  name: string
  games: number
  wins: number
  losses: number
}

export function sideOf(match: Match, memberId: string): Side | null {
  if (match.teams.nos.some((participant) => participant.id === memberId)) {
    return 'nos'
  }
  if (match.teams.ellos.some((participant) => participant.id === memberId)) {
    return 'ellos'
  }
  return null
}

function percent(value: number): number {
  return Math.round(value * 100)
}

function winRate(wins: number, total: number): number | null {
  return total === 0 ? null : percent(wins / total)
}

function averageDuration(matches: Match[]): number | null {
  const durations = matches
    .map((match) => match.durationSeconds)
    .filter((duration): duration is number => duration !== null)
  if (durations.length === 0) {
    return null
  }
  const total = durations.reduce((sum, duration) => sum + duration, 0)
  return Math.round(total / durations.length)
}

function tallyBy(
  played: Match[],
  memberId: string,
  target: 'opponent' | 'partner',
): Map<string, Tally> {
  const tallies = new Map<string, Tally>()
  for (const match of played) {
    const side = sideOf(match, memberId)
    if (!side) {
      continue
    }
    const otherSide: Side = side === 'nos' ? 'ellos' : 'nos'
    const others =
      target === 'opponent'
        ? match.teams[otherSide]
        : match.teams[side].filter((participant) => participant.id !== memberId)
    const won = match.winner === side
    for (const participant of others) {
      const current = tallies.get(participant.id) ?? {
        id: participant.id,
        name: participant.name,
        games: 0,
        wins: 0,
        losses: 0,
      }
      current.games += 1
      if (won) {
        current.wins += 1
      } else {
        current.losses += 1
      }
      tallies.set(participant.id, current)
    }
  }
  return tallies
}

function pickBest(
  tallies: Map<string, Tally>,
  compare: (a: Tally, b: Tally) => number,
  minimum: number,
): Participant | null {
  const eligible = [...tallies.values()].filter(
    (tally) => tally.games >= minimum,
  )
  if (eligible.length === 0) {
    return null
  }
  eligible.sort(compare)
  return { id: eligible[0].id, name: eligible[0].name }
}

function streaks(
  played: Match[],
  memberId: string,
): {
  longestWinStreak: number
  longestLossStreak: number
  currentWinStreak: number
  currentLossStreak: number
} {
  const ordered = played
    .slice()
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  let currentWin = 0
  let currentLoss = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  for (const match of ordered) {
    const side = sideOf(match, memberId)
    if (!side) {
      continue
    }
    if (match.winner === side) {
      currentWin += 1
      currentLoss = 0
      longestWinStreak = Math.max(longestWinStreak, currentWin)
    } else {
      currentLoss += 1
      currentWin = 0
      longestLossStreak = Math.max(longestLossStreak, currentLoss)
    }
  }
  return {
    longestWinStreak,
    longestLossStreak,
    currentWinStreak: currentWin,
    currentLossStreak: currentLoss,
  }
}

export function memberStats(
  member: Member,
  matches: Match[],
  points = 0,
): MemberStats {
  const played = matches.filter((match) => sideOf(match, member.id) !== null)
  const wins = played.filter(
    (match) => match.winner === sideOf(match, member.id),
  ).length
  const opponents = tallyBy(played, member.id, 'opponent')
  const partners = tallyBy(played, member.id, 'partner')

  return {
    id: member.id,
    name: member.name,
    played: played.length,
    wins,
    losses: played.length - wins,
    winRate: winRate(wins, played.length),
    averageDurationSeconds: averageDuration(played),
    bestVictim: pickBest(opponents, (a, b) => b.wins - a.wins, MIN_GAMES),
    toughestRival: pickBest(
      opponents,
      (a, b) => b.losses - a.losses,
      MIN_GAMES,
    ),
    bestPartner: pickBest(
      partners,
      (a, b) => percent(b.wins / b.games) - percent(a.wins / a.games),
      MIN_GAMES,
    ),
    worstPartner: pickBest(
      partners,
      (a, b) => percent(a.wins / a.games) - percent(b.wins / b.games),
      MIN_GAMES,
    ),
    ...streaks(played, member.id),
    points,
  }
}

function combinations(ids: string[], size: number): string[][] {
  if (size <= 0) {
    return [[]]
  }
  if (ids.length < size) {
    return []
  }
  const result: string[][] = []
  for (let i = 0; i <= ids.length - size; i += 1) {
    for (const rest of combinations(ids.slice(i + 1), size - 1)) {
      result.push([ids[i], ...rest])
    }
  }
  return result
}

function teamStats(
  matches: Match[],
  size: number,
): Map<string, { games: number; wins: number }> {
  const teams = new Map<string, { games: number; wins: number }>()
  for (const match of matches) {
    for (const side of ['nos', 'ellos'] as Side[]) {
      const team = match.teams[side]
      if (team.length < size) {
        continue
      }
      const ids = team.map((participant) => participant.id)
      for (const group of combinations(ids, size)) {
        const key = group.sort().join(':')
        const current = teams.get(key) ?? { games: 0, wins: 0 }
        current.games += 1
        if (match.winner === side) {
          current.wins += 1
        }
        teams.set(key, current)
      }
    }
  }
  return teams
}

function nameOf(members: Member[], id: string): string {
  return members.find((member) => member.id === id)?.name ?? id
}

function pickTeam(
  members: Member[],
  matches: Match[],
  size: number,
  direction: 'best' | 'worst',
): TeamStat | null {
  const teams = teamStats(matches, size)
  const eligible = [...teams.entries()].filter(
    ([, stats]) => stats.games >= MIN_GAMES,
  )
  if (eligible.length === 0) {
    return null
  }
  const sign = direction === 'best' ? 1 : -1
  eligible.sort(
    ([, a], [, b]) =>
      sign * (percent(b.wins / b.games) - percent(a.wins / a.games)),
  )
  const [key, stats] = eligible[0]
  return {
    ids: key.split(':'),
    names: key.split(':').map((id) => nameOf(members, id)),
    winRate: percent(stats.wins / stats.games),
    games: stats.games,
  }
}

function maxBy(
  stats: MemberStats[],
  value: (stat: MemberStats) => number,
): MemberStats | null {
  const eligible = stats.filter((stat) => stat.played >= MIN_GAMES)
  if (eligible.length === 0) {
    return null
  }
  return eligible.reduce((best, current) =>
    value(current) > value(best) ? current : best,
  )
}

function minBy(
  stats: MemberStats[],
  value: (stat: MemberStats) => number,
): MemberStats | null {
  const eligible = stats.filter((stat) => stat.played >= MIN_GAMES)
  if (eligible.length === 0) {
    return null
  }
  return eligible.reduce((best, current) =>
    value(current) < value(best) ? current : best,
  )
}

function scoreDifference(match: Match): number {
  return Math.abs(match.scores.nos - match.scores.ellos)
}

// Devuelve la partida que queda primera según `compare` (como en Array.sort).
function pickMatch(
  matches: Match[],
  compare: (a: Match, b: Match) => number,
): Match | null {
  if (matches.length === 0) {
    return null
  }
  return matches.slice().sort(compare)[0]
}

// Quienes tienen la mayor racha (de al menos MIN_STREAK). Si varios empatan
// —por ejemplo, compañeros de equipo— se informan todos.
function bestStreak(
  stats: MemberStats[],
  value: (stat: MemberStats) => number,
): StreakRecord | null {
  const count = Math.max(0, ...stats.map(value))
  if (count < MIN_STREAK) {
    return null
  }
  return {
    members: stats
      .filter((stat) => value(stat) === count)
      .map((stat) => ({ id: stat.id, name: stat.name })),
    count,
  }
}

// El enfrentamiento entre dos integrantes que más veces se jugó; si empatan,
// el más parejo.
function topRivalry(group: Group, matches: Match[]): Rivalry | null {
  const [top] = headToHead(group, matches)
    .filter((row) => row.played >= MIN_GAMES)
    .sort(
      (a, b) =>
        b.played - a.played ||
        Math.abs(a.aWins - a.bWins) - Math.abs(b.aWins - b.bWins),
    )
  if (!top) {
    return null
  }
  return {
    members: [
      { id: top.a.id, name: top.a.name },
      { id: top.b.id, name: top.b.name },
    ],
    played: top.played,
    wins: [top.aWins, top.bWins],
  }
}

export function groupSummary(group: Group, matches: Match[]): GroupSummary {
  const points = computePoints(
    group.members.map((member) => member.id),
    matches,
  )
  const stats = group.members.map((member) =>
    memberStats(member, matches, points.get(member.id) ?? 0),
  )
  const withDuration = matches.filter((match) => match.durationSeconds !== null)
  const longestMatch =
    withDuration.length === 0
      ? null
      : withDuration.reduce((best, current) =>
          (current.durationSeconds ?? 0) > (best.durationSeconds ?? 0)
            ? current
            : best,
        )
  const shortestMatch =
    withDuration.length === 0
      ? null
      : withDuration.reduce((best, current) =>
          (current.durationSeconds ?? 0) < (best.durationSeconds ?? 0)
            ? current
            : best,
        )
  // Si hay empate, la partida más reñida es la que más duró y la de mayor
  // diferencia es la que menos duró.
  const closestMatch = pickMatch(matches, (a, b) => {
    return (
      scoreDifference(a) - scoreDifference(b) ||
      (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1)
    )
  })
  const biggestBlowout = pickMatch(matches, (a, b) => {
    return (
      scoreDifference(b) - scoreDifference(a) ||
      (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity)
    )
  })

  return {
    totalMatches: matches.length,
    averageDurationSeconds: averageDuration(matches),
    longestMatch,
    shortestMatch,
    closestMatch,
    biggestBlowout,
    longestWinStreak: bestStreak(stats, (stat) => stat.longestWinStreak),
    longestLossStreak: bestStreak(stats, (stat) => stat.longestLossStreak),
    activeWinStreak: bestStreak(stats, (stat) => stat.currentWinStreak),
    activeLossStreak: bestStreak(stats, (stat) => stat.currentLossStreak),
    topRivalry: topRivalry(group, matches),
    mostWins: maxBy(stats, (stat) => stat.wins),
    bestWinRate: maxBy(stats, (stat) => stat.winRate ?? -1),
    mostLosses: maxBy(stats, (stat) => stat.losses),
    worstWinRate: minBy(stats, (stat) => stat.winRate ?? 101),
    mostPlayed: maxBy(stats, (stat) => stat.played),
    bestPair: pickTeam(group.members, matches, 2, 'best'),
    worstPair: pickTeam(group.members, matches, 2, 'worst'),
    bestTrio: pickTeam(group.members, matches, 3, 'best'),
    worstTrio: pickTeam(group.members, matches, 3, 'worst'),
  }
}

export interface PodiumEntry {
  stat: MemberStats
  place: number
}

export function podium(
  group: Group,
  matches: Match[],
  size = 3,
): PodiumEntry[] {
  const points = computePoints(
    group.members.map((member) => member.id),
    matches,
  )
  const ranked = group.members
    .map((member) => memberStats(member, matches, points.get(member.id) ?? 0))
    .filter((stat) => stat.played > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        (b.winRate ?? -1) - (a.winRate ?? -1) ||
        b.wins - a.wins ||
        b.played - a.played,
    )
  return ranked.slice(0, size).map((stat) => ({
    stat,
    place:
      ranked.findIndex(
        (item) =>
          item.points === stat.points &&
          item.winRate === stat.winRate &&
          item.wins === stat.wins,
      ) + 1,
  }))
}

export function headToHead(group: Group, matches: Match[]): HeadToHead[] {
  const points = computePoints(
    group.members.map((member) => member.id),
    matches,
  )
  const stats = group.members.map((member) =>
    memberStats(member, matches, points.get(member.id) ?? 0),
  )
  const rows: HeadToHead[] = []
  for (let i = 0; i < group.members.length; i += 1) {
    for (let j = i + 1; j < group.members.length; j += 1) {
      const a = group.members[i]
      const b = group.members[j]
      let played = 0
      let aWins = 0
      let bWins = 0
      for (const match of matches) {
        const aSide = sideOf(match, a.id)
        const bSide = sideOf(match, b.id)
        if (!aSide || !bSide || aSide === bSide) {
          continue
        }
        played += 1
        if (match.winner === aSide) {
          aWins += 1
        } else {
          bWins += 1
        }
      }
      if (played > 0) {
        rows.push({
          a: stats[i],
          b: stats[j],
          played,
          aWins,
          bWins,
          aWinRate: percent(aWins / played),
          bWinRate: percent(bWins / played),
        })
      }
    }
  }
  rows.sort((a, b) => b.played - a.played)
  return rows
}
