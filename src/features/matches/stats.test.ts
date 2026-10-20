import { describe, expect, it } from 'vitest'
import { formatDuration, personalSummary } from './stats'
import type { Match } from './types'

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    type: 'group',
    groupId: 'g1',
    modality: '1v1',
    playedAt: '2026-03-05T20:00:00.000Z',
    durationSeconds: 1800,
    target: 30,
    winner: 'nos',
    teams: { nos: [], ellos: [] },
    scores: { nos: 30, ellos: 21 },
    ...overrides,
  }
}

describe('personalSummary', () => {
  it('devuelve todo en cero sin partidas', () => {
    const summary = personalSummary([])
    expect(summary.total).toBe(0)
    expect(summary.wins).toBe(0)
    expect(summary.losses).toBe(0)
    expect(summary.winRate).toBeNull()
    expect(summary.averageDurationSeconds).toBeNull()
  })

  it('cuenta las victorias cuando gana Nosotros', () => {
    const summary = personalSummary([
      buildMatch({ id: 'm1', winner: 'nos' }),
      buildMatch({ id: 'm2', winner: 'ellos' }),
      buildMatch({ id: 'm3', winner: 'nos' }),
    ])
    expect(summary.total).toBe(3)
    expect(summary.wins).toBe(2)
    expect(summary.losses).toBe(1)
    expect(summary.winRate).toBe(67)
  })

  it('separa las partidas rápidas de las de grupo', () => {
    const summary = personalSummary([
      buildMatch({ id: 'm1', type: 'quick', groupId: null, winner: 'nos' }),
      buildMatch({ id: 'm2', type: 'group', winner: 'ellos' }),
      buildMatch({ id: 'm3', type: 'group', winner: 'nos' }),
    ])
    expect(summary.quick).toEqual({
      total: 1,
      wins: 1,
      losses: 0,
      winRate: 100,
    })
    expect(summary.group).toEqual({
      total: 2,
      wins: 1,
      losses: 1,
      winRate: 50,
    })
  })

  it('calcula la duración promedio solo con las partidas que la tienen', () => {
    const summary = personalSummary([
      buildMatch({ id: 'm1', durationSeconds: 600 }),
      buildMatch({ id: 'm2', durationSeconds: 1800 }),
      buildMatch({ id: 'm3', durationSeconds: null }),
    ])
    expect(summary.averageDurationSeconds).toBe(1200)
  })
})

describe('formatDuration', () => {
  it('redondea a minutos', () => {
    expect(formatDuration(1800)).toBe('30 min')
  })

  it('informa los tiempos menores a un minuto en segundos', () => {
    expect(formatDuration(20)).toBe('20 s')
  })
})
