import { describe, expect, it } from 'vitest'
import type { Group } from '../groups/types'
import { groupOverview, matchWhen } from './groupOverview'
import type { Match } from './types'

const group: Group = {
  id: 'g1',
  name: 'Grupo',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
    { id: 'm4', name: 'Ana' },
  ],
  myMemberId: 'm1',
}

const NAMES: Record<string, string> = {
  m1: 'Juan',
  m2: 'Pedro',
  m3: 'Luis',
  m4: 'Ana',
}

function match(
  id: string,
  nos: string[],
  ellos: string[],
  scores: [number, number],
  playedAt: string,
  extra: Partial<Match> = {},
): Match {
  const team = (ids: string[]) => ids.map((id) => ({ id, name: NAMES[id] }))
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: nos.length === 1 ? '1v1' : '2v2',
    playedAt,
    durationSeconds: 600,
    target: 30,
    winner: scores[0] > scores[1] ? 'nos' : 'ellos',
    teams: { nos: team(nos), ellos: team(ellos) },
    scores: { nos: scores[0], ellos: scores[1] },
    ...extra,
  }
}

const NOW = new Date(2026, 9, 21, 15)
const at = (day: number) => new Date(2026, 9, day, 12).toISOString()

describe('groupOverview', () => {
  it('sin partidas no hay ranking y se conserva el orden de los integrantes', () => {
    const overview = groupOverview(group, [])

    expect(overview.ranking.map((member) => member.name)).toEqual([
      'Juan',
      'Pedro',
      'Luis',
      'Ana',
    ])
    expect(overview.position).toBeNull()
    expect(overview.matchCount).toBe(0)
    expect(overview.last).toBeNull()
    expect(overview.memberCount).toBe(4)
  })

  it('ordena a los integrantes por puntos y da tu posición', () => {
    const matches = [match('p1', ['m2'], ['m1'], [30, 10], at(20))]
    const overview = groupOverview({ ...group, myMemberId: 'm2' }, matches)

    expect(overview.ranking.map((member) => member.name)).toEqual([
      'Pedro',
      'Juan',
      'Luis',
      'Ana',
    ])
    expect(overview.position).toBe(1)
    expect(overview.points).toBeGreaterThan(0)
    expect(overview.matchCount).toBe(1)
  })

  it('quien no jugó no tiene posición pero sí puntos (0)', () => {
    const matches = [match('p1', ['m2'], ['m3'], [30, 10], at(20))]
    const overview = groupOverview(group, matches)

    expect(overview.position).toBeNull()
    expect(overview.points).toBe(0)
  })

  it('sin saber quién es la persona no hay posición ni puntos', () => {
    const matches = [match('p1', ['m2'], ['m3'], [30, 10], at(20))]
    const overview = groupOverview({ ...group, myMemberId: undefined }, matches)

    expect(overview.position).toBeNull()
    expect(overview.points).toBeNull()
  })

  it('las partidas canceladas no cuentan ni son la última', () => {
    const matches = [
      match('p1', ['m1'], ['m2'], [30, 10], at(18)),
      match('p2', ['m1'], ['m2'], [30, 20], at(20), {
        canceled: { at: at(20), by: 'm1', reason: null },
      }),
    ]
    const overview = groupOverview(group, matches)

    expect(overview.matchCount).toBe(1)
    expect(overview.last?.id).toBe('p1')
  })

  it('la última es la más reciente', () => {
    const matches = [
      match('p1', ['m1'], ['m2'], [30, 10], at(15)),
      match('p2', ['m1'], ['m2'], [30, 20], at(19)),
    ]

    expect(groupOverview(group, matches).last?.id).toBe('p2')
  })

  it('ignora partidas de otros grupos', () => {
    const other = match('x', ['m1'], ['m2'], [30, 10], at(19), {
      groupId: 'otro',
    })

    expect(groupOverview(group, [other]).matchCount).toBe(0)
  })
})

describe('matchWhen', () => {
  const atTime = (day: number, hour: number, minute: number) =>
    new Date(2026, 9, day, hour, minute).toISOString()

  it('dice hoy o ayer con la hora', () => {
    const today = match('p1', ['m1'], ['m2'], [30, 10], atTime(21, 9, 5))
    const yesterday = match('p2', ['m1'], ['m2'], [30, 10], atTime(20, 21, 30))

    expect(matchWhen(today, NOW)).toBe('hoy 09:05')
    expect(matchWhen(yesterday, NOW)).toBe('ayer 21:30')
  })

  it('usa la fecha corta para días anteriores', () => {
    const older = match('p1', ['m1'], ['m2'], [30, 10], atTime(18, 18, 0))

    expect(matchWhen(older, NOW)).toBe('18 oct 18:00')
  })
})
