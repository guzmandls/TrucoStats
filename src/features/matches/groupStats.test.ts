import { describe, expect, it } from 'vitest'
import type { Group, Member } from '../groups/types'
import { groupSummary, headToHead, memberStats, podium } from './groupStats'
import type { Match, Participant } from './types'

const juan: Participant = { id: 'm1', name: 'Juan' }
const pedro: Participant = { id: 'm2', name: 'Pedro' }
const luis: Participant = { id: 'm3', name: 'Luis' }
const ana: Participant = { id: 'm4', name: 'Ana' }

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [juan, pedro, luis, ana] as Member[],
}

let sequence = 0

function buildMatch(overrides: Partial<Match> = {}): Match {
  sequence += 1
  return {
    id: `match-${sequence}`,
    type: 'group',
    groupId: 'g1',
    modality: '2v2',
    playedAt: `2026-01-${String(sequence).padStart(2, '0')}T00:00:00.000Z`,
    durationSeconds: 600,
    target: 30,
    winner: 'nos',
    teams: { nos: [juan, pedro], ellos: [luis, ana] },
    scores: { nos: 30, ellos: 20 },
    ...overrides,
  }
}

describe('memberStats', () => {
  it('cuenta partidas, victorias, derrotas y porcentaje', () => {
    const stats = memberStats(juan, [
      buildMatch(),
      buildMatch(),
      buildMatch(),
      buildMatch({ winner: 'ellos' }),
    ])
    expect(stats.played).toBe(4)
    expect(stats.wins).toBe(3)
    expect(stats.losses).toBe(1)
    expect(stats.winRate).toBe(75)
  })

  it('calcula la racha más larga de victorias y de derrotas', () => {
    const stats = memberStats(juan, [
      buildMatch({ winner: 'nos' }),
      buildMatch({ winner: 'nos' }),
      buildMatch({ winner: 'ellos' }),
      buildMatch({ winner: 'nos' }),
    ])
    expect(stats.longestWinStreak).toBe(2)
    expect(stats.longestLossStreak).toBe(1)
  })

  it('exige un mínimo de 3 partidas para el rival al que más le gana', () => {
    const two = memberStats(juan, [buildMatch(), buildMatch()])
    expect(two.bestVictim).toBeNull()

    const three = memberStats(juan, [buildMatch(), buildMatch(), buildMatch()])
    expect(three.bestVictim).toEqual(luis)
  })

  it('encuentra el mejor compañero con al menos 3 partidas juntos', () => {
    const stats = memberStats(juan, [buildMatch(), buildMatch(), buildMatch()])
    expect(stats.bestPartner).toEqual(pedro)
    expect(stats.worstPartner).toEqual(pedro)
  })

  it('promedia la duración solo de las partidas con duración', () => {
    const stats = memberStats(juan, [
      buildMatch({ durationSeconds: 300 }),
      buildMatch({ durationSeconds: 900 }),
      buildMatch({ durationSeconds: null }),
    ])
    expect(stats.averageDurationSeconds).toBe(600)
  })
})

describe('groupSummary', () => {
  it('resume el total de partidas', () => {
    const summary = groupSummary(group, [
      buildMatch({ modality: '2v2' }),
      buildMatch({ modality: '1v1', teams: { nos: [juan], ellos: [luis] } }),
      buildMatch({ modality: '1v1', teams: { nos: [juan], ellos: [luis] } }),
    ])
    expect(summary.totalMatches).toBe(3)
  })

  it('marca la partida más larga y la más corta', () => {
    const summary = groupSummary(group, [
      buildMatch({ durationSeconds: 300 }),
      buildMatch({ durationSeconds: 1800 }),
      buildMatch({ durationSeconds: 900 }),
    ])
    expect(summary.longestMatch?.durationSeconds).toBe(1800)
    expect(summary.shortestMatch?.durationSeconds).toBe(300)
  })

  it('encuentra la partida con mayor diferencia de puntos', () => {
    const summary = groupSummary(group, [
      buildMatch({ scores: { nos: 30, ellos: 28 } }),
      buildMatch({ scores: { nos: 30, ellos: 10 } }),
      buildMatch({ scores: { nos: 30, ellos: 21 } }),
    ])
    expect(summary.biggestBlowout?.scores).toEqual({ nos: 30, ellos: 10 })
  })

  it('en la partida más reñida, ante un empate gana la que más duró', () => {
    const summary = groupSummary(group, [
      buildMatch({ scores: { nos: 30, ellos: 28 }, durationSeconds: 600 }),
      buildMatch({ scores: { nos: 30, ellos: 28 }, durationSeconds: 1500 }),
      buildMatch({ scores: { nos: 30, ellos: 10 }, durationSeconds: 2000 }),
    ])
    expect(summary.closestMatch?.durationSeconds).toBe(1500)
  })

  it('en la mayor diferencia, ante un empate gana la que menos duró', () => {
    const summary = groupSummary(group, [
      buildMatch({ scores: { nos: 30, ellos: 10 }, durationSeconds: 900 }),
      buildMatch({ scores: { nos: 30, ellos: 10 }, durationSeconds: 400 }),
      buildMatch({ scores: { nos: 30, ellos: 28 }, durationSeconds: 100 }),
    ])
    expect(summary.biggestBlowout?.durationSeconds).toBe(400)
  })

  it('informa la racha de victorias más larga, con todos los que empatan', () => {
    const summary = groupSummary(group, [
      buildMatch(),
      buildMatch(),
      buildMatch(),
    ])
    expect(summary.longestWinStreak?.members).toEqual([juan, pedro])
    expect(summary.longestWinStreak?.count).toBe(3)
    expect(summary.longestLossStreak?.members).toEqual([luis, ana])
  })

  it('no considera racha un solo resultado', () => {
    const summary = groupSummary(group, [buildMatch()])
    expect(summary.longestWinStreak).toBeNull()
    expect(summary.activeWinStreak).toBeNull()
  })

  it('informa las rachas en curso, que se cortan con un resultado distinto', () => {
    const summary = groupSummary(group, [
      buildMatch(),
      buildMatch(),
      buildMatch({ winner: 'ellos' }),
      buildMatch({ winner: 'ellos' }),
    ])
    expect(summary.activeWinStreak?.members).toEqual([luis, ana])
    expect(summary.activeWinStreak?.count).toBe(2)
    expect(summary.activeLossStreak?.members).toEqual([juan, pedro])
    expect(summary.longestWinStreak?.count).toBe(2)
  })

  it('encuentra el enfrentamiento más repetido', () => {
    const summary = groupSummary(group, [
      buildMatch(),
      buildMatch(),
      buildMatch(),
      buildMatch({
        teams: { nos: [juan], ellos: [luis] },
        winner: 'ellos',
      }),
    ])
    expect(summary.topRivalry?.played).toBe(4)
    expect(summary.topRivalry?.members).toEqual([juan, luis])
    expect(summary.topRivalry?.wins).toEqual([3, 1])
  })

  it('no informa rivalidad con menos de 3 partidas', () => {
    const summary = groupSummary(group, [buildMatch(), buildMatch()])
    expect(summary.topRivalry).toBeNull()
  })

  it('no compara integrantes con menos de 3 partidas', () => {
    const summary = groupSummary(group, [buildMatch(), buildMatch()])
    expect(summary.mostWins).toBeNull()
  })

  it('encuentra la mejor pareja', () => {
    const summary = groupSummary(group, [
      buildMatch(),
      buildMatch(),
      buildMatch(),
    ])
    expect(summary.bestPair?.names).toEqual(['Juan', 'Pedro'])
    expect(summary.bestPair?.winRate).toBe(100)
  })

  it('encuentra la peor pareja por winrate', () => {
    const summary = groupSummary(group, [
      buildMatch({ winner: 'ellos' }),
      buildMatch({ winner: 'ellos' }),
      buildMatch({ winner: 'ellos' }),
    ])
    expect(summary.worstPair?.names).toEqual(['Juan', 'Pedro'])
    expect(summary.worstPair?.winRate).toBe(0)
  })

  it('encuentra la mejor y la peor terna', () => {
    const a1: Participant = { id: 't1', name: 'Ana' }
    const a2: Participant = { id: 't2', name: 'Beto' }
    const a3: Participant = { id: 't3', name: 'Caro' }
    const b1: Participant = { id: 't4', name: 'Dino' }
    const b2: Participant = { id: 't5', name: 'Eva' }
    const b3: Participant = { id: 't6', name: 'Fito' }
    const terna: Group = {
      id: 'g3',
      name: 'Terna',
      adminMemberId: 't1',
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [a1, a2, a3, b1, b2, b3] as Member[],
    }
    const teams = { nos: [a1, a2, a3], ellos: [b1, b2, b3] }
    const summary = groupSummary(terna, [
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
    ])
    expect(summary.bestTrio?.names.sort()).toEqual(['Ana', 'Beto', 'Caro'])
    expect(summary.bestTrio?.winRate).toBe(100)
    expect(summary.worstTrio?.names.sort()).toEqual(['Dino', 'Eva', 'Fito'])
    expect(summary.worstTrio?.winRate).toBe(0)
  })

  it('cuenta como pareja a dos integrantes que jugaron juntos en un equipo de 3', () => {
    const a1: Participant = { id: 't1', name: 'Ana' }
    const a2: Participant = { id: 't2', name: 'Beto' }
    const a3: Participant = { id: 't3', name: 'Caro' }
    const b1: Participant = { id: 't4', name: 'Dino' }
    const b2: Participant = { id: 't5', name: 'Eva' }
    const b3: Participant = { id: 't6', name: 'Fito' }
    const terna: Group = {
      id: 'g4',
      name: 'Terna',
      adminMemberId: 't1',
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [a1, a2, a3, b1, b2, b3] as Member[],
    }
    const teams = { nos: [a1, a2, a3], ellos: [b1, b2, b3] }
    const summary = groupSummary(terna, [
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
      buildMatch({ modality: '3v3', teams, winner: 'nos' }),
    ])
    expect(summary.bestPair?.names.sort()).toEqual(['Ana', 'Beto'])
    expect(summary.bestPair?.winRate).toBe(100)
  })
})

describe('headToHead', () => {
  it('resume los enfrentamientos entre integrantes', () => {
    const rows = headToHead(group, [
      buildMatch(),
      buildMatch(),
      buildMatch(),
      buildMatch({ winner: 'ellos' }),
    ])
    const juanLuis = rows.find(
      (row) =>
        [row.a.name, row.b.name].includes('Juan') &&
        [row.a.name, row.b.name].includes('Luis'),
    )
    expect(juanLuis?.played).toBe(4)
    const juanWins =
      juanLuis?.a.name === 'Juan' ? juanLuis?.aWins : juanLuis?.bWins
    expect(juanWins).toBe(3)
  })

  it('no arma enfrentamientos de compañeros', () => {
    const rows = headToHead(group, [buildMatch()])
    const juanPedro = rows.find(
      (row) =>
        [row.a.name, row.b.name].includes('Juan') &&
        [row.a.name, row.b.name].includes('Pedro'),
    )
    expect(juanPedro).toBeUndefined()
  })
})

describe('podium', () => {
  const trio: Group = {
    id: 'g2',
    name: 'Terna',
    adminMemberId: 'm1',
    createdAt: '2026-01-01T00:00:00.000Z',
    members: [juan, pedro, luis] as Member[],
  }

  function duel(
    winner: Participant,
    loser: Participant,
    overrides: Partial<Match> = {},
  ): Match {
    sequence += 1
    return {
      id: `duel-${sequence}`,
      type: 'group',
      groupId: 'g2',
      modality: '1v1',
      playedAt: `2026-02-${String(sequence).padStart(2, '0')}T00:00:00.000Z`,
      durationSeconds: 600,
      target: 30,
      winner: 'nos',
      teams: { nos: [winner], ellos: [loser] },
      scores: { nos: 30, ellos: 20 },
      ...overrides,
    }
  }

  it('ordena por porcentaje y desempata por victorias', () => {
    const entries = podium(trio, [
      duel(juan, pedro),
      duel(juan, luis),
      duel(pedro, luis),
    ])
    expect(entries.map((entry) => entry.stat.name)).toEqual([
      'Juan',
      'Pedro',
      'Luis',
    ])
    expect(entries.map((entry) => entry.place)).toEqual([1, 2, 3])
  })

  it('comparte el primer puesto con el mismo winrate y las mismas victorias', () => {
    const entries = podium(trio, [
      duel(juan, pedro),
      duel(pedro, luis),
      duel(luis, juan),
    ])
    expect(entries).toHaveLength(3)
    expect(entries.map((entry) => entry.place)).toEqual([1, 2, 3])
  })
})
