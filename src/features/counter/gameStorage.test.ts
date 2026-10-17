import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearGame, loadGame, saveGame } from './gameStorage'
import { useCounter } from './useCounter'

const emptyGame = {
  version: 1,
  target: 30,
  firstReached: null,
  declined: false,
  history: { nos: [], ellos: [] },
}

describe('gameStorage', () => {
  beforeEach(async () => {
    await clearGame()
  })

  it('devuelve null cuando no hay partida guardada', async () => {
    expect(await loadGame()).toBeNull()
  })

  it('guarda y recupera la partida', async () => {
    await saveGame({ ...emptyGame, history: { nos: [3, 1], ellos: [5] } })
    const game = await loadGame()
    expect(game?.history).toEqual({ nos: [3, 1], ellos: [5] })
  })

  it('ignora datos con una versión desconocida', async () => {
    await saveGame({ ...emptyGame, version: 999 } as never)
    expect(await loadGame()).toBeNull()
  })
})

describe('useCounter - persistencia', () => {
  beforeEach(async () => {
    await clearGame()
  })

  it('restaura la partida guardada al iniciar', async () => {
    await saveGame({ ...emptyGame, history: { nos: [3], ellos: [2] } })
    const { result } = renderHook(() => useCounter())
    await waitFor(() => expect(result.current.points('nos')).toBe(3))
    expect(result.current.points('ellos')).toBe(2)
    expect(result.current.started).toBe(true)
  })

  it('guarda los cambios en el almacenamiento', async () => {
    const { result } = renderHook(() => useCounter())
    await waitFor(async () => {
      expect(await loadGame()).not.toBeNull()
    })

    act(() => {
      result.current.startIncrement('nos')
      result.current.finishIncrement()
    })

    await waitFor(async () => {
      const game = await loadGame()
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
      expect((await loadGame())?.declined).toBe(true)
    })
  })
})
