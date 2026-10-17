import { describe, expect, it } from 'vitest'
import {
  canUndo,
  commit,
  createInitialState,
  displayPoints,
  hasReachedTarget,
  hasStarted,
  increment,
  pointsOf,
  undo,
  updateFirstReached,
  winnerOf,
} from './counterLogic'

describe('contador - estado inicial', () => {
  it('empieza en cero para ambos equipos', () => {
    const state = createInitialState()
    expect(displayPoints(state, 'nos')).toBe(0)
    expect(displayPoints(state, 'ellos')).toBe(0)
  })

  it('no permite deshacer al inicio', () => {
    const state = createInitialState()
    expect(canUndo(state, 'nos')).toBe(false)
    expect(canUndo(state, 'ellos')).toBe(false)
  })
})

describe('contador - sumar puntos', () => {
  it('un toque suma un punto al confirmar', () => {
    let state = createInitialState()
    state = increment(state, 'nos', 30)
    expect(displayPoints(state, 'nos')).toBe(1)
    state = commit(state)
    expect(pointsOf(state, 'nos')).toBe(1)
  })

  it('una pulsación prolongada es una sola acción', () => {
    let state = createInitialState()
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = commit(state)
    expect(pointsOf(state, 'nos')).toBe(3)
    expect(state.history.nos).toEqual([3])
  })

  it('cada equipo lleva su propio marcador', () => {
    let state = createInitialState()
    state = increment(state, 'nos', 30)
    state = increment(state, 'ellos', 30)
    state = commit(state)
    state = increment(state, 'ellos', 30)
    state = commit(state)
    expect(pointsOf(state, 'nos')).toBe(1)
    expect(pointsOf(state, 'ellos')).toBe(2)
  })

  it('no supera el puntaje de victoria', () => {
    let state = createInitialState()
    for (let i = 0; i < 10; i += 1) {
      state = increment(state, 'nos', 5)
    }
    state = commit(state)
    expect(pointsOf(state, 'nos')).toBe(5)
    expect(hasReachedTarget(state, 'nos', 5)).toBe(true)
  })
})

describe('contador - deshacer', () => {
  it('deshace un punto a la vez', () => {
    let state = createInitialState()
    state = commit(increment(state, 'nos', 30))
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = commit(state)
    expect(pointsOf(state, 'nos')).toBe(4)

    state = undo(state, 'nos')
    expect(pointsOf(state, 'nos')).toBe(3)

    state = undo(state, 'nos')
    expect(pointsOf(state, 'nos')).toBe(2)
  })

  it('descuenta de a un punto una pulsación prolongada', () => {
    let state = createInitialState()
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = increment(state, 'nos', 30)
    state = commit(state)
    expect(state.history.nos).toEqual([3])

    state = undo(state, 'nos')
    expect(state.history.nos).toEqual([2])

    state = undo(state, 'nos')
    state = undo(state, 'nos')
    expect(state.history.nos).toEqual([])
    expect(canUndo(state, 'nos')).toBe(false)
  })

  it('no hace nada si no hay acciones', () => {
    const state = createInitialState()
    expect(undo(state, 'nos')).toEqual(state)
  })

  it('deshacer un equipo no afecta al otro', () => {
    let state = createInitialState()
    state = commit(increment(state, 'nos', 30))
    state = commit(increment(state, 'ellos', 30))
    state = undo(state, 'nos')
    expect(pointsOf(state, 'nos')).toBe(0)
    expect(pointsOf(state, 'ellos')).toBe(1)
  })
})

describe('contador - partida iniciada', () => {
  it('no está iniciada al comienzo', () => {
    expect(hasStarted(createInitialState())).toBe(false)
  })

  it('está iniciada al haber una acción confirmada', () => {
    const state = commit(increment(createInitialState(), 'nos', 30))
    expect(hasStarted(state)).toBe(true)
  })
})

describe('contador - ganador', () => {
  function reach(team: 'nos' | 'ellos', target: number) {
    let state = createInitialState()
    for (let i = 0; i < target; i += 1) {
      state = increment(state, team, target)
    }
    return commit(state)
  }

  it('sin alcanzar el objetivo no hay ganador', () => {
    let state = createInitialState()
    state = commit(increment(state, 'nos', 30))
    expect(winnerOf(state, 30, null)).toBeNull()
  })

  it('el equipo que alcanza el objetivo es el ganador', () => {
    const state = reach('ellos', 30)
    expect(winnerOf(state, 30, null)).toBe('ellos')
  })

  it('registra al primero en alcanzar el objetivo', () => {
    const state = reach('nos', 30)
    expect(updateFirstReached(state, 30, null)).toBe('nos')
  })

  it('si el primero baja del objetivo, se olvida', () => {
    let state = reach('nos', 30)
    const firstReached = updateFirstReached(state, 30, null)
    state = undo(state, 'nos')
    expect(updateFirstReached(state, 30, firstReached)).toBeNull()
  })
})
