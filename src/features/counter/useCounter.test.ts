import 'fake-indexeddb/auto'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches } from '../matches/matchesStorage'
import type { GameContext } from './gameContext'
import { QUICK_SLOT, clearGame, groupSlot } from './gameStorage'
import { useCounter } from './useCounter'

const groupContext: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
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
}

function addPoints(
  result: { current: ReturnType<typeof useCounter> },
  team: 'nos' | 'ellos',
  count: number,
) {
  act(() => {
    for (let i = 0; i < count; i += 1) {
      result.current.startIncrement(team)
    }
    result.current.finishIncrement()
  })
}

beforeEach(async () => {
  await clearGame(QUICK_SLOT)
  await clearGame(groupSlot('g1'))
  for (const match of await loadMatches()) {
    await deleteMatch(match.id)
  }
})

describe('useCounter', () => {
  it('arranca con objetivo por defecto y sin iniciar', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.target).toBe(30)
    expect(result.current.started).toBe(false)
    expect(result.current.winner).toBeNull()
  })

  it('ajusta el objetivo a múltiplos de 5 dentro de 10..100', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.setTarget(27))
    expect(result.current.target).toBe(25)
    act(() => result.current.setTarget(3))
    expect(result.current.target).toBe(10)
    act(() => result.current.setTarget(1000))
    expect(result.current.target).toBe(100)
  })

  it('no permite cambiar el objetivo una vez iniciada la partida', () => {
    const { result } = renderHook(() => useCounter())
    addPoints(result, 'nos', 1)
    act(() => result.current.setTarget(50))
    expect(result.current.target).toBe(30)
  })

  it('declara ganador al alcanzar el objetivo', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'ellos', 10)
    expect(result.current.hasReached('ellos')).toBe(true)
    expect(result.current.winner).toBe('ellos')
  })

  it('confirmar inicia una partida nueva', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 10)
    act(() => result.current.confirm())
    expect(result.current.points('nos')).toBe(0)
    expect(result.current.points('ellos')).toBe(0)
    expect(result.current.started).toBe(false)
    expect(result.current.winner).toBeNull()
  })

  it('confirmar conserva el objetivo elegido', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.setTarget(50))
    addPoints(result, 'nos', 50)
    act(() => result.current.confirm())
    expect(result.current.target).toBe(50)
  })

  it('no confirma si nadie alcanzó el objetivo', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 3)
    act(() => result.current.confirm())
    expect(result.current.points('nos')).toBe(3)
    expect(result.current.winner).toBeNull()
  })

  it('rechazar mantiene el puntaje y oculta la confirmación', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 10)
    expect(result.current.awaitingConfirmation).toBe(true)
    act(() => result.current.decline())
    expect(result.current.points('nos')).toBe(10)
    expect(result.current.awaitingConfirmation).toBe(false)
  })

  it('tras rechazar, deshacer y volver a llegar reactiva la confirmación', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 10)
    act(() => result.current.decline())
    act(() => result.current.undoTeam('nos'))
    expect(result.current.points('nos')).toBe(9)
    addPoints(result, 'nos', 1)
    expect(result.current.awaitingConfirmation).toBe(true)
  })
})

describe('useCounter - contexto', () => {
  it('recibe el contexto de la partida', () => {
    const { result } = renderHook(() => useCounter(30, groupContext))
    expect(result.current.context).toEqual(groupContext)
  })

  it('conserva el contexto al iniciar una partida nueva tras confirmar', () => {
    const { result } = renderHook(() => useCounter(10, groupContext))
    addPoints(result, 'nos', 10)
    act(() => result.current.confirm())
    expect(result.current.context).toEqual(groupContext)
  })
})

describe('useCounter - guardado de partidas confirmadas', () => {
  it('guarda la partida de grupo con sus integrantes', async () => {
    const { result } = renderHook(() => useCounter(10, groupContext))
    addPoints(result, 'nos', 10)
    act(() => result.current.confirm())

    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      type: 'group',
      groupId: 'g1',
      modality: '2v2',
      target: 10,
      winner: 'nos',
      teams: groupContext.teams,
      scores: { nos: 10, ellos: 0 },
    })
    expect(matches[0].playedAt).toBeTruthy()
  })

  it('guarda la partida rápida sin integrantes', async () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'ellos', 10)
    act(() => result.current.confirm())

    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      type: 'quick',
      groupId: null,
      modality: null,
      winner: 'ellos',
      teams: { nos: [], ellos: [] },
    })
  })

  it('no guarda nada si nadie alcanzó el objetivo', async () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 3)
    act(() => result.current.confirm())
    expect(await loadMatches()).toHaveLength(0)
  })
})
