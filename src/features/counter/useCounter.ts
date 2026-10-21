import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
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
  contextOf,
  gameSlot,
  hasMoves,
  loadGame,
  saveGame,
  type GameSlot,
  type PersistedGame,
} from './gameStorage'
import { quickContext, type GameContext } from './gameContext'
import { removeLastPoint } from './counterLogic'
import {
  createTimer,
  elapsedSeconds,
  isPaused,
  pauseTimer as pauseTimerState,
  resumeTimer as resumeTimerState,
  settleTimer,
  type TimerState,
} from './gameTimer'
import { syncPendingMatches } from '../groups/matchesSync'
import { saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { computePointsDelta } from '../matches/points'
import { loadMatchesByGroupId } from '../matches/matchesStorage'
import { forStats } from '../matches/guests'
import { loadGroups } from '../groups/groupsStorage'
import { activeMatches } from '../matches/status'

export const DEFAULT_TARGET = 30
export const MIN_TARGET = 10
export const MAX_TARGET = 100
export const TARGET_STEP = 5

interface GameState {
  counter: CounterState
  target: number
  firstReached: Team | null
  declined: boolean
  context: GameContext
  timer: TimerState
}

type GameAction =
  | { type: 'increment'; team: Team; now: number }
  | { type: 'commit' }
  | { type: 'undo'; team: Team }
  | { type: 'setTarget'; target: number }
  | { type: 'confirm' }
  | { type: 'decline' }
  | { type: 'pauseTimer'; now: number }
  | { type: 'resumeTimer'; now: number }
  | { type: 'settleAway'; lastActiveAt: number; now: number }
  | { type: 'hydrate'; state: GameState }

export function clampTarget(target: number, min: number = MIN_TARGET): number {
  const stepped = Math.round(target / TARGET_STEP) * TARGET_STEP
  return Math.min(MAX_TARGET, Math.max(min, stepped))
}

export function minTargetFor(counter: CounterState): number {
  const highest = Math.max(
    displayPoints(counter, 'nos'),
    displayPoints(counter, 'ellos'),
  )
  const needed = Math.ceil((highest + 1) / TARGET_STEP) * TARGET_STEP
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, needed))
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

  if (action.type === 'pauseTimer') {
    return { ...state, timer: pauseTimerState(state.timer, action.now) }
  }
  if (action.type === 'resumeTimer') {
    return { ...state, timer: resumeTimerState(state.timer, action.now) }
  }
  if (action.type === 'settleAway') {
    return {
      ...state,
      timer: settleTimer(state.timer, action.lastActiveAt, action.now),
    }
  }

  // Pausar solo detiene el cronómetro: se puede seguir sumando, restando y
  // cambiando el objetivo.
  switch (action.type) {
    case 'increment': {
      const counter = increment(state.counter, action.team, state.target)
      const next = withFirstReached(state, counter)
      // Sumar puntos reanuda el cronómetro (deshacer no). Si no se sumó nada (el
      // equipo ya llegó al objetivo), tampoco.
      return counter === state.counter
        ? next
        : { ...next, timer: resumeTimerState(state.timer, action.now) }
    }
    case 'commit':
      return withFirstReached(state, commit(state.counter))
    case 'undo':
      return withFirstReached(state, undo(state.counter, action.team))
    case 'setTarget': {
      const target = clampTarget(action.target, minTargetFor(state.counter))
      return {
        ...state,
        target,
        firstReached: updateFirstReached(
          state.counter,
          target,
          state.firstReached,
        ),
        declined: false,
      }
    }
    case 'confirm':
      if (!winnerOf(state.counter, state.target)) {
        return state
      }
      return createGameState(state.target, state.context)
    case 'decline': {
      const winner = winnerOf(state.counter, state.target)
      if (!winner) {
        return state
      }
      const counter = removeLastPoint(state.counter, winner)
      return {
        ...state,
        counter,
        firstReached: updateFirstReached(
          counter,
          state.target,
          state.firstReached,
        ),
        declined: true,
      }
    }
    default:
      return state
  }
}

function createGameState(
  target: number,
  context: GameContext = quickContext(),
): GameState {
  return {
    counter: createInitialState(),
    target: clampTarget(target),
    firstReached: null,
    declined: false,
    context,
    timer: createTimer(Date.now()),
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
    context: contextOf(game),
    // Si el contador estuvo cerrado más de un minuto sin pausar, el cronómetro
    // vuelve pausado en ese límite.
    timer: settleTimer(
      game.timer ?? createTimer(Date.now()),
      game.lastActiveAt,
      Date.now(),
    ),
  }
}

function createId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

// Cada cuánto se anota que el contador sigue abierto y a la vista.
const ACTIVE_HEARTBEAT_MS = 10_000

export type CounterController = ReturnType<typeof useCounter>

export function useCounter(
  defaultTarget: number = DEFAULT_TARGET,
  initialContext: GameContext = quickContext(),
) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createGameState(defaultTarget, initialContext),
  )
  const [hydrated, setHydrated] = useState(
    () => typeof indexedDB === 'undefined',
  )
  const initialContextRef = useRef(initialContext)
  const [slot] = useState<GameSlot>(() => gameSlot(initialContext))

  useEffect(() => {
    if (typeof indexedDB === 'undefined') {
      return
    }
    let active = true
    void loadGame(slot).then((game) => {
      if (!active) {
        return
      }
      if (game) {
        const hydratedState = fromPersisted(game)
        dispatch({
          type: 'hydrate',
          state: {
            ...hydratedState,
            context: hasMoves(game)
              ? hydratedState.context
              : initialContextRef.current,
          },
        })
      }
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [slot])

  // Cuándo se usó el contador por última vez (abierto y a la vista). Se guarda con
  // la partida: si queda cerrado más de un minuto sin pausar, el cronómetro se
  // pausa solo (al volver, se ajusta en el límite).
  const [activeAt, setActiveAt] = useState(() => Date.now())
  const activeAtRef = useRef(activeAt)
  useEffect(() => {
    activeAtRef.current = activeAt
  }, [activeAt])

  useEffect(() => {
    const touch = () => setActiveAt(Date.now())
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        touch()
      }
    }, ACTIVE_HEARTBEAT_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        touch()
        return
      }
      // Al volver a la app: si pasó más de un minuto desde la última vez, el
      // cronómetro queda pausado en ese límite.
      dispatch({
        type: 'settleAway',
        lastActiveAt: activeAtRef.current,
        now: Date.now(),
      })
      touch()
    }
    window.addEventListener('pagehide', touch)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', touch)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const persisted = useMemo<PersistedGame>(
    () => ({
      version: GAME_VERSION,
      lastActiveAt: activeAt,
      target: state.target,
      firstReached: state.firstReached,
      declined: state.declined,
      history: state.counter.history,
      context: state.context,
      timer: state.timer,
    }),
    [
      state.target,
      state.firstReached,
      state.declined,
      state.counter.history,
      state.context,
      state.timer,
      activeAt,
    ],
  )

  useEffect(() => {
    if (!hydrated) {
      return
    }
    void saveGame(slot, persisted)
  }, [hydrated, persisted, slot])

  // Al salir del contador se guarda ya la hora, para que el minuto de gracia
  // cuente desde acá.
  const latestRef = useRef({ persisted, hydrated })
  useEffect(() => {
    latestRef.current = { persisted, hydrated }
  })
  useEffect(() => {
    return () => {
      const { persisted: last, hydrated: ready } = latestRef.current
      if (ready) {
        void saveGame(slot, { ...last, lastActiveAt: Date.now() })
      }
    }
  }, [slot])

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
    dispatch({ type: 'increment', team, now: Date.now() })
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
    const winnerTeam = winnerOf(state.counter, state.target)
    if (winnerTeam) {
      const match: Match = {
        id: createId(),
        type: state.context.type,
        groupId: state.context.groupId,
        modality: state.context.modality,
        playedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds(state.timer, Date.now()),
        target: state.target,
        winner: winnerTeam,
        teams: state.context.teams,
        scores: {
          nos: points('nos'),
          ellos: points('ellos'),
        },
      }
      // Guardar primero en el celular; después se intenta enviar al servidor.
      void saveMatch(match).then(() => syncPendingMatches())
      if (state.context.groupId) {
        void (async () => {
          const group = (await loadGroups()).find(
            (item) => item.id === state.context.groupId,
          )
          // Los invitados no suman ni restan puntos: solo cuentan los integrantes.
          const toStats = (matches: Match[]) =>
            group ? forStats(group, matches) : matches
          const existing = toStats(
            activeMatches(await loadMatchesByGroupId(state.context.groupId!)),
          )
          const [counted] = toStats([match])
          const ids = new Set<string>()
          for (const m of [...existing, counted]) {
            for (const side of ['nos', 'ellos'] as Team[]) {
              for (const p of m.teams[side]) {
                ids.add(p.id)
              }
            }
          }
          const delta = computePointsDelta(Array.from(ids), existing, counted)
          const changes = Array.from(delta.entries())
            .filter(([, d]) => d !== 0)
            .map(
              ([id, d]) =>
                `${id}:${(d as number) > 0 ? '+' : ''}${d as number}`,
            )
          if (changes.length > 0) {
            try {
              sessionStorage.setItem(
                'trucostats:pointsDelta',
                changes.join(','),
              )
            } catch {
              // Sin almacenamiento de sesión, simplemente no se muestra el aviso
              // de puntos al volver al grupo.
            }
          }
        })()
      }
    }
    dispatch({ type: 'confirm' })
  }, [points, state.context, state.counter, state.target, state.timer])

  const decline = useCallback(() => {
    dispatch({ type: 'decline' })
  }, [])

  const paused = isPaused(state.timer)

  const togglePause = useCallback(() => {
    dispatch(
      isPaused(state.timer)
        ? { type: 'resumeTimer', now: Date.now() }
        : { type: 'pauseTimer', now: Date.now() },
    )
  }, [state.timer])

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (paused) {
      return
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [paused])

  const elapsed = elapsedSeconds(state.timer, now)

  const winner = winnerOf(state.counter, state.target)

  return {
    target: state.target,
    minTarget: minTargetFor(state.counter),
    context: state.context,
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
    paused,
    togglePause,
    elapsed,
  }
}
