import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from './matchesStorage'
import type { Match } from './types'

const match: Match = {
  id: 'm1',
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  playedAt: '2026-01-01T00:00:00.000Z',
  durationSeconds: 1800,
  target: 30,
  winner: 'nos',
  teams: {
    nos: [
      { id: 'p1', name: 'Juan' },
      { id: 'p2', name: 'Pedro' },
    ],
    ellos: [
      { id: 'p3', name: 'Luis' },
      { id: 'p4', name: 'Ana' },
    ],
  },
  scores: { nos: 30, ellos: 21 },
}

describe('matchesStorage', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
  })

  it('devuelve una lista vacía cuando no hay partidas', async () => {
    expect(await loadMatches()).toEqual([])
  })

  it('guarda y recupera una partida', async () => {
    await saveMatch(match)
    expect(await loadMatches()).toEqual([match])
  })

  it('guarda una partida rápida sin grupo ni modalidad', async () => {
    const quick: Match = {
      ...match,
      id: 'm2',
      type: 'quick',
      groupId: null,
      modality: null,
      durationSeconds: null,
      teams: { nos: [], ellos: [] },
    }
    await saveMatch(quick)
    expect(await loadMatches()).toEqual([quick])
  })

  it('elimina una partida', async () => {
    await saveMatch(match)
    await deleteMatch('m1')
    expect(await loadMatches()).toEqual([])
  })

  it('ignora registros con forma inválida', async () => {
    await saveMatch({ id: 'invalido', type: 'otra' } as never)
    expect(await loadMatches()).toEqual([])
  })
})
