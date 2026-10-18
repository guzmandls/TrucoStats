import { describe, expect, it } from 'vitest'
import { isGameContext, quickContext } from './gameContext'

describe('quickContext', () => {
  it('describe una partida rápida sin integrantes', () => {
    expect(quickContext()).toEqual({
      type: 'quick',
      groupId: null,
      teams: { nos: [], ellos: [] },
      modality: null,
    })
  })
})

describe('isGameContext', () => {
  it('acepta partidas rápidas y de grupo', () => {
    expect(isGameContext(quickContext())).toBe(true)
    expect(
      isGameContext({
        type: 'group',
        groupId: 'g1',
        modality: '2v2',
        teams: {
          nos: [{ id: 'p1', name: 'Juan' }],
          ellos: [{ id: 'p2', name: 'Luis' }],
        },
      }),
    ).toBe(true)
  })

  it('rechaza objetos sin la forma esperada', () => {
    expect(isGameContext(null)).toBe(false)
    expect(isGameContext('quick')).toBe(false)
    expect(isGameContext({ type: 'otra' })).toBe(false)
  })

  it('rechaza grupos, modalidades o equipos inválidos', () => {
    const valid = {
      type: 'group',
      groupId: 'g1',
      modality: '2v2',
      teams: { nos: [], ellos: [] },
    }
    expect(isGameContext({ ...valid, groupId: 7 })).toBe(false)
    expect(isGameContext({ ...valid, modality: '4v4' })).toBe(false)
    expect(isGameContext({ ...valid, teams: 'x' })).toBe(false)
    expect(isGameContext({ ...valid, teams: { nos: [], ellos: [7] } })).toBe(
      false,
    )
    expect(isGameContext({ ...valid, teams: { nos: [{ id: 'p1' }] } })).toBe(
      false,
    )
  })
})
