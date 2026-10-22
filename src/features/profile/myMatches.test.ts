import { describe, expect, it } from 'vitest'
import type { Group } from '../groups/types'
import type { Match } from '../matches/types'
import { myMatches } from './myMatches'

const group: Group = {
  id: 'g1',
  name: 'Grupo',
  adminMemberIds: ['ana'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'ana', name: 'Ana' },
    { id: 'beto', name: 'Beto', aliases: ['Betito'] },
    { id: 'carlos', name: 'Carlos' },
  ],
  myMemberId: 'beto',
}

function match(
  id: string,
  nos: Match['teams']['nos'],
  ellos: Match['teams']['ellos'],
  winner: Match['winner'],
): Match {
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: '1v1',
    playedAt: '2026-10-05T20:00:00.000Z',
    durationSeconds: 600,
    target: 30,
    winner,
    teams: { nos, ellos },
    scores: winner === 'nos' ? { nos: 30, ellos: 10 } : { nos: 10, ellos: 30 },
  }
}

describe('myMatches', () => {
  it('cuenta las partidas de grupo desde el equipo de la persona', () => {
    const result = myMatches(
      [
        // Beto en Ellos, gana Ellos: victoria de Beto.
        match(
          'a',
          [{ id: 'ana', name: 'Ana' }],
          [{ id: 'beto', name: 'Beto' }],
          'ellos',
        ),
        // Beto en Nosotros, gana Ellos: derrota.
        match(
          'b',
          [{ id: 'beto', name: 'Beto' }],
          [{ id: 'carlos', name: 'Carlos' }],
          'ellos',
        ),
      ],
      [group],
    )
    expect(result.map((item) => [item.id, item.winner])).toEqual([
      ['a', 'nos'],
      ['b', 'ellos'],
    ])
    expect(result[0].scores).toEqual({ nos: 30, ellos: 10 })
  })

  it('no cuenta las partidas de grupo en las que no jugó', () => {
    const result = myMatches(
      [
        match(
          'a',
          [{ id: 'ana', name: 'Ana' }],
          [{ id: 'carlos', name: 'Carlos' }],
          'nos',
        ),
      ],
      [group],
    )
    expect(result).toEqual([])
  })

  it('cuenta las partidas en las que lo anotaron con un apodo', () => {
    const result = myMatches(
      [
        match(
          'a',
          [{ id: 'ana', name: 'Ana' }],
          [{ id: 'x', name: 'Betito', guest: true }],
          'ellos',
        ),
      ],
      [group],
    )
    expect(result.map((item) => item.winner)).toEqual(['nos'])
  })

  it('incluye las partidas rápidas tal cual y excluye grupos donde no se sabe quién es', () => {
    const quick: Match = {
      ...match('q', [], [], 'nos'),
      type: 'quick',
      groupId: null,
    }
    const unknown: Group = { ...group, myMemberId: undefined }
    const result = myMatches(
      [
        quick,
        match(
          'a',
          [{ id: 'beto', name: 'Beto' }],
          [{ id: 'ana', name: 'Ana' }],
          'nos',
        ),
      ],
      [unknown],
    )
    expect(result.map((item) => item.id)).toEqual(['q'])
  })
})
