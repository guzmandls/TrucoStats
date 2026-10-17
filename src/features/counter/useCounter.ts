import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  canUndo,
  commit,
  createInitialState,
  displayPoints,
  hasReachedTarget,
  hasStarted,
  increment,
  undo,
  updateFirstReached,
  winnerOf,
  type CounterState,
  type Team,
} from './counterLogic'
import {
  GAME_VERSION,
  loadGame,
  saveGame,
  type PersistedGame,
} from './gameStorage'

export const DEFAULT_TARGET = 30
export const MIN_TARGET = 10
export const MAX_TARGET = 100
export const TARGET_STEP = 5

interface GameState {
  counter: CounterState
  target: number
  firstReached: Team | null
  declined: boolean
}

type GameAction =
  | { type: 'increment'; team: Team }
  | { type: 'commit' }
  | { type: 'undo'; team: Team }
  | { type: 'setTarget'; target: number }
  | { type: 'confirm' }
  | { type: 'decline' }
  | { type: 'hydrate'; state: GameState }

function clampTarget(target: number): number {
  const stepped = Math.round(target / TARGET_STEP) * TARGET_STEP
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, stepped))
}

function withFirstReached(state: GameState, counter: CounterState): GameState {
  return {
    ...state,
    counter,
    firstReached: updateFirstReached(counter, state.target, state.firstReached),
    declined: false,
  }
}

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'hydrate') {
    return action.state
  }

  switch (action.type) {
    case 'increment':
      return withFirstReached(
        state,
        increment(state.counter, action.team, state.target),
      )
    case 'commit':
      return withFirstReached(state, commit(state.counter))
    case 'undo':
      return withFirstReached(state, undo(state.counter, action.team))
    case 'setTarget':
      if (hasStarted(state.counter)) {
        return state
      }
      return { ...state, target: clampTarget(action.target) }
    case 'confirm':
      if (!winnerOf(state.counter, state.target, state.firstReached)) {
        return state
      }
      return createGameState(state.target)
    case 'decline':
      if (!winnerOf(state.counter, state.target, state.firstReached)) {
        return state
      }
      return { ...state, declined: true }
    default:
      return state
  }
}

function createGameState(target: number): GameState {
  return {
    counter: createInitialState(),
    target: clampTarget(target),
    firstReached: null,
    declined: false,
  }
}

function fromPersisted(game: PersistedGame): GameState {
  return {
    counter: {
      history: {
        nos: game.history.nos ?? [],
        ellos: game.history.ellos ?? [],
      },
      pending: null,
    },
    target: clampTarget(game.target),
    firstReached: game.firstReached,
    declined: game.declined ?? false,
  }
}

export type CounterController = ReturnType<typeof useCounter>

export function useCounter(defaultTarget: number = DEFAULT_TARGET) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createGameState(defaultTarget),
  )
  const [hydrated, setHydrated] = useState(
    () => typeof indexedDB === 'undefined',
  )

  useEffect(() => {
    if (typeof indexedDB === 'undefined') {
      return
    }
    let active = true
    void loadGame().then((game) => {
      if (!active) {
        return
      }
      if (game) {
        dispatch({ type: 'hydrate', state: fromPersisted(game) })
      }
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [])

  const persisted = useMemo<PersistedGame>(
    () => ({
      version: GAME_VERSION,
      target: state.target,
      firstReached: state.firstReached,
      declined: state.declined,
      history: state.counter.history,
    }),
    [state.target, state.firstReached, state.declined, state.counter.history],
  )

  useEffect(() => {
    if (!hydrated) {
      return
    }
    void saveGame(persisted)
  }, [hydrated, persisted])

  const points = useCallback(
    (team: Team) => displayPoints(state.counter, team),
    [state.counter],
  )

  const canUndoTeam = useCallback(
    (team: Team) => canUndo(state.counter, team),
    [state.counter],
  )

  const hasReached = useCallback(
    (team: Team) => hasReachedTarget(state.counter, team, state.target),
    [state.counter, state.target],
  )

  const startIncrement = useCallback((team: Team) => {
    dispatch({ type: 'increment', team })
  }, [])

  const finishIncrement = useCallback(() => {
    dispatch({ type: 'commit' })
  }, [])

  const undoTeam = useCallback((team: Team) => {
    dispatch({ type: 'undo', team })
  }, [])

  const setTarget = useCallback((target: number) => {
    dispatch({ type: 'setTarget', target })
  }, [])

  const confirm = useCallback(() => {
    dispatch({ type: 'confirm' })
  }, [])

  const decline = useCallback(() => {
    dispatch({ type: 'decline' })
  }, [])

  const winner = winnerOf(state.counter, state.target, state.firstReached)

  return {
    target: state.target,
    started: hasStarted(state.counter),
    winner,
    awaitingConfirmation: winner !== null && !state.declined,
    points,
    canUndo: canUndoTeam,
    hasReached,
    startIncrement,
    finishIncrement,
    undoTeam,
    setTarget,
    confirm,
    decline,
  }
}
