import { describe, expect, it } from 'vitest'
import type { Match } from '../matches/types'
import { availableActions } from './matchActions'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Grupo',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
  ],
  myMemberId: 'm2',
}

// Una hora de plazo: la partida llegó al servidor hace 30 minutos.
const NOW = Date.parse('2026-03-05T21:00:00.000Z')
const MINUTE = 60_000
const ago = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString()

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
  syncedAt: ago(30),
  createdBy: 'm3',
  registeredAt: ago(30),
}

const canceledBy = (by: string | null, minutesAgo = 10): Match => ({
  ...match,
  canceled: { at: ago(minutesAgo), by, reason: null },
})

const actions = (m: Match, myMemberId: string | undefined) =>
  availableActions(m, { ...group, myMemberId }, NOW)

describe('availableActions', () => {
  it('el administrador puede cancelar cualquier partida, también una vieja', () => {
    expect(actions(match, 'm1')).toEqual(['cancel'])
    expect(
      actions({ ...match, registeredAt: ago(60 * 24 * 60) }, 'm1'),
    ).toEqual(['cancel'])
  })

  it('quien la registró puede cancelarla dentro de la hora', () => {
    expect(actions(match, 'm3')).toEqual(['cancel'])
  })

  it('quien la registró ya no puede pasada la hora', () => {
    expect(actions({ ...match, registeredAt: ago(61) }, 'm3')).toEqual([])
  })

  it('sin fecha de registro conocida no ofrece nada a quien no es administrador', () => {
    expect(actions({ ...match, registeredAt: undefined }, 'm3')).toEqual([])
  })

  it('otro integrante no puede hacer nada', () => {
    expect(actions(match, 'm2')).toEqual([])
    expect(actions(canceledBy('m1'), 'm2')).toEqual([])
  })

  it('el administrador restaura siempre', () => {
    expect(actions(canceledBy('m3', 60 * 24), 'm1')).toEqual(['restore'])
  })

  it('quien canceló puede restaurar dentro de la hora desde la cancelación', () => {
    expect(actions(canceledBy('m2', 10), 'm2')).toEqual(['restore'])
    expect(actions(canceledBy('m2', 61), 'm2')).toEqual([])
  })

  it('una partida sin enviar es de esta persona y no tiene plazo', () => {
    const pending: Match = {
      ...match,
      syncedAt: undefined,
      createdBy: undefined,
      registeredAt: undefined,
    }

    expect(actions(pending, 'm2')).toEqual(['cancel'])
  })

  it('sin saber quién es la persona no ofrece nada', () => {
    expect(actions(match, undefined)).toEqual([])
  })
})
