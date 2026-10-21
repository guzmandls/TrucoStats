import { describe, expect, it } from 'vitest'
import { filterMatches } from './search'
import type { Match } from './types'

function match(
  id: string,
  nos: string,
  ellos: string,
  scores: [number, number],
  playedAt: string,
): Match {
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: '1v1',
    playedAt,
    durationSeconds: 600,
    target: 30,
    winner: scores[0] > scores[1] ? 'nos' : 'ellos',
    teams: {
      nos: [{ id: `${id}-a`, name: nos }],
      ellos: [{ id: `${id}-b`, name: ellos }],
    },
    scores: { nos: scores[0], ellos: scores[1] },
  }
}

const matches = [
  match('1', 'Juan', 'Pérez', [30, 21], '2026-03-05T20:00:00.000Z'),
  match('2', 'Ana', 'Luis', [12, 30], '2026-10-20T20:00:00.000Z'),
  match('3', 'Juan', 'Luis', [30, 5], '2026-10-21T20:00:00.000Z'),
]

const ids = (found: Match[]) => found.map((item) => item.id)

describe('filterMatches', () => {
  it('sin búsqueda devuelve todas', () => {
    expect(filterMatches(matches, '  ')).toEqual(matches)
  })

  it('busca por participante sin importar mayúsculas ni tildes', () => {
    expect(ids(filterMatches(matches, 'perez'))).toEqual(['1'])
    expect(ids(filterMatches(matches, 'JUAN'))).toEqual(['1', '3'])
  })

  it('busca por fecha', () => {
    expect(ids(filterMatches(matches, '20/10'))).toEqual(['2'])
    expect(ids(filterMatches(matches, 'octubre'))).toEqual(['2', '3'])
  })

  it('busca por resultado', () => {
    expect(ids(filterMatches(matches, '30-21'))).toEqual(['1'])
    expect(ids(filterMatches(matches, '12'))).toEqual(['2'])
  })

  it('pide que aparezcan todas las palabras', () => {
    expect(ids(filterMatches(matches, 'juan luis'))).toEqual(['3'])
    expect(filterMatches(matches, 'juan zzz')).toEqual([])
  })
})
