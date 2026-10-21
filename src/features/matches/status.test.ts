import { describe, expect, it } from 'vitest'
import { activeMatches, isCanceled } from './status'
import type { Match } from './types'

const base: Match = {
  id: 'p1',
  type: 'group',
  groupId: 'g1',
  modality: '1v1',
  playedAt: '2026-03-05T20:00:00.000Z',
  durationSeconds: 600,
  target: 30,
  winner: 'nos',
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
  scores: { nos: 30, ellos: 12 },
}
const canceled: Match = {
  ...base,
  id: 'p2',
  canceled: { at: '2026-03-06T10:00:00.000Z', by: 'm1', reason: null },
}

describe('status de las partidas', () => {
  it('reconoce una partida cancelada', () => {
    expect(isCanceled(base)).toBe(false)
    expect(isCanceled(canceled)).toBe(true)
  })

  it('las partidas que cuentan excluyen las canceladas', () => {
    expect(activeMatches([base, canceled]).map((match) => match.id)).toEqual([
      'p1',
    ])
  })
})
