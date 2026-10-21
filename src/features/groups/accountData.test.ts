import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { clearAccountData, countUnsentGroupMatches } from './accountData'
import { loadGroups, saveGroup } from './groupsStorage'
import { addMembership, loadMembership } from './membership'

function match(id: string, groupId: string | null, syncedAt?: string): Match {
  return {
    id,
    type: groupId ? 'group' : 'quick',
    modality: '1v1',
    groupId,
    playedAt: '2026-10-05T20:00:00.000Z',
    durationSeconds: 600,
    target: 30,
    winner: 'nos',
    teams: {
      nos: [{ id: 'p1', name: 'Ana' }],
      ellos: [{ id: 'p2', name: 'Beto' }],
    },
    scores: { nos: 30, ellos: 10 },
    ...(syncedAt ? { syncedAt } : {}),
  } as Match
}

beforeEach(async () => {
  localStorage.clear()
  for (const group of await loadGroups()) {
    await import('./groupsStorage').then((m) => m.deleteGroup(group.id))
  }
  for (const item of await loadMatches()) {
    await import('../matches/matchesStorage').then((m) =>
      m.deleteMatch(item.id),
    )
  }
})

describe('clearAccountData', () => {
  it('quita grupos, partidas de grupo y membresía, y conserva la partida rápida', async () => {
    await saveGroup({
      id: 'g1',
      name: 'Los de siempre',
      adminMemberIds: ['m1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [{ id: 'm1', name: 'Ana' }],
    })
    addMembership('g1')
    await saveMatch(match('a', 'g1', '2026-10-05T21:00:00.000Z'))
    await saveMatch(match('b', null))

    await clearAccountData()

    expect(await loadGroups()).toEqual([])
    expect((await loadMatches()).map((item) => item.id)).toEqual(['b'])
    expect(loadMembership()).toEqual([])
  })

  it('cuenta las partidas de grupo sin enviar', async () => {
    await saveMatch(match('a', 'g1'))
    await saveMatch(match('b', 'g1', '2026-10-05T21:00:00.000Z'))
    await saveMatch(match('c', null))

    expect(await countUnsentGroupMatches()).toBe(1)
  })
})
