import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearFinishedGames,
  clearGame,
  loadFinishedGames,
  loadGame,
  saveFinishedGame,
  saveGame,
} from './gameStorage'
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

describe('historial de partidas', () => {
  beforeEach(async () => {
    await clearFinishedGames()
  })

  it('devuelve una lista vacía al principio', async () => {
    expect(await loadFinishedGames()).toEqual([])
  })

  it('guarda las partidas y las devuelve de la más reciente a la más antigua', async () => {
    await saveFinishedGame({
      playedAt: 1000,
      target: 10,
      nos: 4,
      ellos: 10,
      winner: 'ellos',
    })
    await saveFinishedGame({
      playedAt: 2000,
      target: 30,
      nos: 30,
      ellos: 12,
      winner: 'nos',
    })

    const games = await loadFinishedGames()
    expect(games).toHaveLength(2)
    expect(games[0]).toMatchObject({ winner: 'nos', target: 30 })
    expect(games[1]).toMatchObject({ winner: 'ellos', target: 10 })
  })
})

describe('useCounter - historial', () => {
  beforeEach(async () => {
    await clearFinishedGames()
  })

  it('al confirmar el ganador guarda la partida finalizada', async () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => {
      for (let i = 0; i < 10; i += 1) {
        result.current.startIncrement('nos')
      }
      result.current.finishIncrement()
    })
    act(() => result.current.confirm())

    await waitFor(async () => {
      const games = await loadFinishedGames()
      expect(games).toHaveLength(1)
      expect(games[0]).toMatchObject({
        target: 10,
        nos: 10,
        ellos: 0,
        winner: 'nos',
      })
    })
  })

  it('rechazar la confirmación no guarda ninguna partida', async () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => {
      for (let i = 0; i < 10; i += 1) {
        result.current.startIncrement('nos')
      }
      result.current.finishIncrement()
    })
    act(() => result.current.decline())

    expect(await loadFinishedGames()).toEqual([])
  })
})
