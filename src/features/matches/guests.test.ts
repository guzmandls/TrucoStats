import { describe, expect, it } from 'vitest'
import type { Group } from '../groups/types'
import { forStats, normalizeName } from './guests'
import { START_POINTS, computePoints } from './points'
import type { Match } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan', aliases: ['Juancho', 'juanito'] },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
  ],
}

function match(
  id: string,
  nos: Match['teams']['nos'],
  ellos: Match['teams']['ellos'],
  playedAt = '2026-03-01T20:00:00.000Z',
): Match {
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: '2v2',
    playedAt,
    durationSeconds: 600,
    target: 40,
    winner: 'nos',
    teams: { nos, ellos },
    scores: { nos: 40, ellos: 10 },
  }
}

describe('normalizeName', () => {
  it('ignora mayúsculas, tildes y espacios', () => {
    expect(normalizeName('  JuanCHÓ ')).toBe('juancho')
  })
})

describe('forStats', () => {
  it('deja igual las partidas sin invitados', () => {
    const plain = match(
      'p1',
      [{ id: 'm1', name: 'Juan' }],
      [{ id: 'm2', name: 'Pedro' }],
    )
    expect(forStats(group, [plain])[0]).toBe(plain)
  })

  it('quita a los invitados que no tienen apodo de ningún integrante', () => {
    const withGuests = match(
      'p1',
      [
        { id: 'm1', name: 'Juan' },
        { id: 'x1', name: 'Beto', guest: true },
      ],
      [
        { id: 'm2', name: 'Pedro' },
        { id: 'x2', name: 'Lucho', guest: true },
      ],
    )

    const [result] = forStats(group, [withGuests])

    expect(result.teams.nos).toEqual([{ id: 'm1', name: 'Juan' }])
    expect(result.teams.ellos).toEqual([{ id: 'm2', name: 'Pedro' }])
  })

  it('un invitado con el apodo de un integrante cuenta como ese integrante', () => {
    const withAlias = match(
      'p1',
      [{ id: 'm2', name: 'Pedro' }],
      [
        { id: 'm3', name: 'Luis' },
        { id: 'x1', name: ' JUANCHÓ', guest: true },
      ],
    )
    // Un apodo con distinta escritura también coincide.
    const [result] = forStats(
      {
        ...group,
        members: [
          { ...group.members[0], aliases: ['Juancho'] },
          ...group.members.slice(1),
        ],
      },
      [withAlias],
    )

    expect(result.teams.ellos).toEqual([
      { id: 'm3', name: 'Luis' },
      { id: 'm1', name: 'Juan' },
    ])
  })

  it('si el integrante ya juega esa partida, el invitado con su apodo es otra persona', () => {
    const both = match(
      'p1',
      [
        { id: 'm1', name: 'Juan' },
        { id: 'x1', name: 'Juancho', guest: true },
      ],
      [{ id: 'm2', name: 'Pedro' }],
    )

    const [result] = forStats(group, [both])

    expect(result.teams.nos).toEqual([{ id: 'm1', name: 'Juan' }])
  })

  it('los puntos solo los reciben los integrantes (y los apodos cuentan)', () => {
    const matches = [
      match(
        'p1',
        [
          { id: 'm2', name: 'Pedro' },
          { id: 'x1', name: 'Beto', guest: true },
        ],
        [
          { id: 'm3', name: 'Luis' },
          { id: 'x2', name: 'Juancho', guest: true },
        ],
      ),
    ]
    const ids = group.members.map((member) => member.id)

    const points = computePoints(ids, forStats(group, matches))

    // Pedro gana (sube desde 0); Luis y Juan (por su apodo) pierden y siguen en 0.
    expect(points.get('m2')).toBeGreaterThan(START_POINTS)
    expect(points.get('m3')).toBe(START_POINTS)
    // Juancho es apodo de Juan: perdió esa partida, así que también la cuenta.
    expect(points.has('m1')).toBe(true)
    expect([...points.keys()].some((id) => id.startsWith('x'))).toBe(false)
  })
})
