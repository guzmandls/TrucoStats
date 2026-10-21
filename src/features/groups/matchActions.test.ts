import { describe, expect, it } from 'vitest'
import type { Match } from '../matches/types'
import { availableActions } from './matchActions'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Grupo',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
  ],
  myMemberId: 'm2',
}

const match: Match = {
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
    ellos: [{ id: 'm3', name: 'Luis' }],
  },
  scores: { nos: 30, ellos: 12 },
  syncedAt: '2026-03-05T21:00:00.000Z',
  createdBy: 'm3',
}

const canceledBy = (by: string | null): Match => ({
  ...match,
  canceled: { at: '2026-03-06T10:00:00.000Z', by, reason: null },
})

describe('availableActions', () => {
  it('el administrador puede cancelar cualquier partida', () => {
    expect(availableActions(match, { ...group, myMemberId: 'm1' })).toEqual([
      'cancel',
    ])
  })

  it('quien la registró puede cancelarla', () => {
    expect(availableActions(match, { ...group, myMemberId: 'm3' })).toEqual([
      'cancel',
    ])
  })

  it('otro integrante no puede hacer nada', () => {
    expect(availableActions(match, group)).toEqual([])
    expect(availableActions(canceledBy('m1'), group)).toEqual([])
  })

  it('una partida cancelada solo se restaura: el administrador o quien la canceló', () => {
    expect(
      availableActions(canceledBy('m3'), { ...group, myMemberId: 'm1' }),
    ).toEqual(['restore'])
    expect(availableActions(canceledBy('m2'), group)).toEqual(['restore'])
  })

  it('una partida sin enviar es de esta persona', () => {
    const pending: Match = {
      ...match,
      syncedAt: undefined,
      createdBy: undefined,
    }

    expect(availableActions(pending, group)).toEqual(['cancel'])
  })

  it('sin saber quién es la persona no ofrece nada', () => {
    expect(
      availableActions(match, { ...group, myMemberId: undefined }),
    ).toEqual([])
  })
})
