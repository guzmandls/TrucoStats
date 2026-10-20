import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { GAME_STORE, put } from '../../lib/db'
import type { GameContext } from './gameContext'
import {
  GAME_VERSION,
  QUICK_SLOT,
  clearGame,
  gameScore,
  groupSlot,
  loadGame,
  migrateLegacyGame,
  saveGame,
} from './gameStorage'
import { useCounter } from './useCounter'

const groupContext: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '3v3',
  teams: {
    nos: [{ id: 'p1', name: 'Juan' }],
    ellos: [{ id: 'p2', name: 'Luis' }],
  },
}

const otherGroupContext: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '1v1',
  teams: {
    nos: [{ id: 'p3', name: 'Ana' }],
    ellos: [{ id: 'p4', name: 'Pedro' }],
  },
}

const emptyGame = {
  version: GAME_VERSION,
  target: 30,
  firstReached: null,
  declined: false,
  history: { nos: [], ellos: [] },
  timer: { baseSeconds: 0, startedAt: 1000 },
}

async function clearAllSlots() {
  await clearGame(QUICK_SLOT)
  await clearGame(groupSlot('g1'))
  await clearGame(groupSlot('g2'))
  await clearGame('current')
}

describe('gameStorage', () => {
  beforeEach(clearAllSlots)

  it('devuelve null cuando no hay partida guardada', async () => {
    expect(await loadGame(QUICK_SLOT)).toBeNull()
  })

  it('guarda y recupera la partida', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [3, 1], ellos: [5] },
    })
    const game = await loadGame(QUICK_SLOT)
    expect(game?.history).toEqual({ nos: [3, 1], ellos: [5] })
  })

  it('ignora datos con una versión desconocida', async () => {
    await saveGame(QUICK_SLOT, { ...emptyGame, version: 999 } as never)
    expect(await loadGame(QUICK_SLOT)).toBeNull()
  })

  it('mantiene separadas la partida rápida y las de cada grupo', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [1], ellos: [] },
    })
    await saveGame(groupSlot('g1'), {
      ...emptyGame,
      history: { nos: [], ellos: [4] },
    })
    await saveGame(groupSlot('g2'), {
      ...emptyGame,
      history: { nos: [7, 2], ellos: [] },
    })

    expect((await loadGame(QUICK_SLOT))?.history.nos).toEqual([1])
    expect((await loadGame(groupSlot('g1')))?.history.ellos).toEqual([4])
    expect((await loadGame(groupSlot('g2')))?.history.nos).toEqual([7, 2])
  })

  it('limpiar una ranura no afecta a las demás', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [1], ellos: [] },
    })
    await saveGame(groupSlot('g1'), {
      ...emptyGame,
      history: { nos: [2], ellos: [] },
    })

    await clearGame(QUICK_SLOT)

    expect(await loadGame(QUICK_SLOT)).toBeNull()
    expect((await loadGame(groupSlot('g1')))?.history.nos).toEqual([2])
  })
})

describe('gameStorage - migración de la clave antigua', () => {
  beforeEach(clearAllSlots)

  it('mueve la partida guardada como «current» a la ranura del grupo', async () => {
    await put(
      GAME_STORE,
      { ...emptyGame, history: { nos: [3], ellos: [] }, context: groupContext },
      'current',
    )
    await migrateLegacyGame()
    expect((await loadGame(groupSlot('g1')))?.history.nos).toEqual([3])
    expect(await loadGame('current')).toBeNull()
  })

  it('mueve una partida rápida a la ranura rápida', async () => {
    await put(
      GAME_STORE,
      { ...emptyGame, history: { nos: [1], ellos: [2] } },
      'current',
    )
    await migrateLegacyGame()
    expect((await loadGame(QUICK_SLOT))?.history).toEqual({
      nos: [1],
      ellos: [2],
    })
    expect(await loadGame('current')).toBeNull()
  })

  it('descarta la clave antigua si el dato no es válido', async () => {
    await put(GAME_STORE, { cualquier: 'cosa' }, 'current')
    await migrateLegacyGame()
    expect(await loadGame('current')).toBeNull()
    expect(await loadGame(QUICK_SLOT)).toBeNull()
  })
})

describe('gameScore', () => {
  it('suma el historial de cada equipo', () => {
    expect(
      gameScore({
        ...emptyGame,
        history: { nos: [3, 2], ellos: [1, 1, 1] },
      }),
    ).toEqual({ nos: 5, ellos: 3 })
  })

  it('devuelve cero con el historial vacío', () => {
    expect(gameScore(emptyGame)).toEqual({ nos: 0, ellos: 0 })
  })
})

describe('useCounter - persistencia', () => {
  beforeEach(clearAllSlots)

  it('restaura la partida guardada al iniciar', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [3], ellos: [2] },
    })
    const { result } = renderHook(() => useCounter())
    await waitFor(() => expect(result.current.points('nos')).toBe(3))
    expect(result.current.points('ellos')).toBe(2)
    expect(result.current.started).toBe(true)
  })

  it('guarda los cambios en el almacenamiento', async () => {
    const { result } = renderHook(() => useCounter())
    await waitFor(async () => {
      expect(await loadGame(QUICK_SLOT)).not.toBeNull()
    })

    act(() => {
      result.current.startIncrement('nos')
      result.current.finishIncrement()
    })

    await waitFor(async () => {
      const game = await loadGame(QUICK_SLOT)
      expect(game?.history.nos).toEqual([1])
    })
  })

  it('conserva el rechazo de la confirmación al recargar', async () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => {
      for (let i = 0; i < 10; i += 1) {
        result.current.startIncrement('nos')
      }
      result.current.finishIncrement()
    })
    act(() => result.current.decline())

    await waitFor(async () => {
      expect((await loadGame(QUICK_SLOT))?.declined).toBe(true)
    })
  })

  it('guarda la partida de grupo en su propia ranura', async () => {
    renderHook(() => useCounter(30, groupContext))
    await waitFor(async () => {
      expect((await loadGame(groupSlot('g1')))?.context).toEqual(groupContext)
    })
    expect(await loadGame(QUICK_SLOT)).toBeNull()
  })

  it('usa el contexto recibido si la partida guardada está vacía', async () => {
    await saveGame(groupSlot('g1'), emptyGame)
    const { result } = renderHook(() => useCounter(30, groupContext))
    await waitFor(() => expect(result.current.context).toEqual(groupContext))
  })

  it('conserva el contexto guardado si la partida ya tiene movimientos', async () => {
    await saveGame(groupSlot('g1'), {
      ...emptyGame,
      history: { nos: [2], ellos: [1] },
      context: groupContext,
    })
    const { result } = renderHook(() => useCounter(30, otherGroupContext))
    await waitFor(() => expect(result.current.context).toEqual(groupContext))
    expect(result.current.points('nos')).toBe(2)
  })

  it('no mezcla la partida rápida con la de un grupo', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [5], ellos: [] },
    })
    const { result } = renderHook(() => useCounter(30, groupContext))
    await waitFor(() => expect(result.current.points('nos')).toBe(0))
    expect((await loadGame(QUICK_SLOT))?.history.nos).toEqual([5])
  })
})
