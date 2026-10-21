import { describe, expect, it } from 'vitest'
import {
  matchMeta,
  matchMetaParts,
  matchScore,
  participantNames,
} from './format'
import type { Match, Participant } from './types'

const juan: Participant = { id: 'm1', name: 'Juan' }
const pedro: Participant = { id: 'm2', name: 'Pedro' }
const luis: Participant = { id: 'm3', name: 'Luis' }
const ana: Participant = { id: 'm4', name: 'Ana' }

const groupMatch: Match = {
  id: 'm1',
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  playedAt: '2026-03-05T20:00:00.000Z',
  durationSeconds: 1800,
  target: 30,
  winner: 'nos',
  teams: { nos: [juan, pedro], ellos: [luis, ana] },
  scores: { nos: 30, ellos: 21 },
}

const quickMatch: Match = {
  ...groupMatch,
  id: 'm2',
  type: 'quick',
  groupId: null,
  modality: null,
  durationSeconds: null,
  teams: { nos: [], ellos: [] },
}

describe('participantNames', () => {
  it('devuelve null sin integrantes', () => {
    expect(participantNames([])).toBeNull()
  })

  it('usa el nombre con un integrante', () => {
    expect(participantNames([juan])).toBe('Juan')
  })

  it('une dos nombres con y', () => {
    expect(participantNames([juan, pedro])).toBe('Juan - Pedro')
  })

  it('separa los nombres con guiones', () => {
    expect(participantNames([juan, pedro, ana])).toBe('Juan - Pedro - Ana')
  })
})

describe('matchScore', () => {
  it('muestra el resultado final', () => {
    expect(matchScore(groupMatch)).toBe('30 – 21')
  })
})

describe('matchMeta', () => {
  it('incluye modalidad, objetivo y fecha', () => {
    const meta = matchMeta(groupMatch)
    expect(meta).toContain('2v2')
    expect(meta).toContain('30 puntos')
    expect(meta).toContain('2026')
  })

  it('incluye la duración cuando existe', () => {
    expect(matchMeta(groupMatch)).toContain('30 min')
    expect(matchMeta(quickMatch)).not.toContain('min')
  })

  it('omite la modalidad en partidas rápidas', () => {
    expect(matchMeta(quickMatch)).not.toContain('1v1')
    expect(matchMeta(quickMatch)).not.toContain('2v2')
    expect(matchMeta(quickMatch)).not.toContain('3v3')
  })
})

describe('matchMetaParts', () => {
  const base: Match = {
    id: 'p1',
    type: 'group',
    groupId: 'g1',
    modality: '3v3',
    playedAt: '2026-03-05T20:00:00.000Z',
    durationSeconds: 600,
    target: 40,
    winner: 'nos',
    teams: { nos: [], ellos: [] },
    scores: { nos: 40, ellos: 30 },
  }

  it('separa modalidad, puntos y duración en líneas cortas', () => {
    expect(matchMetaParts({ ...base })).toEqual(['3v3', '40 pts', '10 min'])
  })

  it('omite lo que no hay', () => {
    expect(
      matchMetaParts({ ...base, modality: null, durationSeconds: null }),
    ).toEqual(['40 pts'])
  })
})
