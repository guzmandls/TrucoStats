export type Team = 'nos' | 'ellos'

export const TEAMS: readonly Team[] = ['nos', 'ellos']

export interface PendingAction {
  team: Team
  amount: number
}

export interface CounterState {
  history: Record<Team, number[]>
  pending: PendingAction | null
}

export function createInitialState(): CounterState {
  return {
    history: { nos: [], ellos: [] },
    pending: null,
  }
}

export function pointsOf(state: CounterState, team: Team): number {
  return state.history[team].reduce((total, amount) => total + amount, 0)
}

export function displayPoints(state: CounterState, team: Team): number {
  const pending = state.pending
  if (pending && pending.team === team) {
    return pointsOf(state, team) + pending.amount
  }
  return pointsOf(state, team)
}

export function hasReachedTarget(
  state: CounterState,
  team: Team,
  target: number,
): boolean {
  return displayPoints(state, team) >= target
}

export function commit(state: CounterState): CounterState {
  const pending = state.pending
  if (!pending) {
    return state
  }
  if (pending.amount === 0) {
    return { ...state, pending: null }
  }
  const history = { ...state.history }
  history[pending.team] = [...history[pending.team], pending.amount]
  return { history, pending: null }
}

export function increment(
  state: CounterState,
  team: Team,
  target: number,
): CounterState {
  if (hasReachedTarget(state, team, target)) {
    return state
  }
  if (state.pending && state.pending.team === team) {
    return { ...state, pending: { team, amount: state.pending.amount + 1 } }
  }
  const committed = commit(state)
  return { ...committed, pending: { team, amount: 1 } }
}

export function canUndo(state: CounterState, team: Team): boolean {
  return state.history[team].length > 0
}

export function undo(state: CounterState, team: Team): CounterState {
  const committed = commit(state)
  const actions = committed.history[team]
  if (actions.length === 0) {
    return committed
  }
  const history = { ...committed.history }
  history[team] = actions.slice(0, -1)
  return { history, pending: null }
}

export function removeLastPoint(state: CounterState, team: Team): CounterState {
  const committed = commit(state)
  const actions = committed.history[team]
  if (actions.length === 0) {
    return committed
  }
  const last = actions[actions.length - 1]
  const history = { ...committed.history }
  if (last > 1) {
    history[team] = [...actions.slice(0, -1), last - 1]
  } else {
    history[team] = actions.slice(0, -1)
  }
  return { history, pending: null }
}

export function hasStarted(state: CounterState): boolean {
  return (
    state.pending !== null ||
    state.history.nos.length > 0 ||
    state.history.ellos.length > 0
  )
}

export function updateFirstReached(
  state: CounterState,
  target: number,
  current: Team | null,
): Team | null {
  if (current && !hasReachedTarget(state, current, target)) {
    return null
  }
  const nosReached = hasReachedTarget(state, 'nos', target)
  const ellosReached = hasReachedTarget(state, 'ellos', target)
  if (nosReached && ellosReached) {
    const pn = displayPoints(state, 'nos')
    const pe = displayPoints(state, 'ellos')
    if (pn === pe) {
      return null
    }
    if (current && current === (pn > pe ? 'nos' : 'ellos')) {
      return current
    }
    return pn > pe ? 'nos' : 'ellos'
  }
  if (!current) {
    if (nosReached && !ellosReached) {
      return 'nos'
    }
    if (ellosReached && !nosReached) {
      return 'ellos'
    }
  }
  if (current && nosReached && !ellosReached) {
    return 'nos'
  }
  if (current && ellosReached && !nosReached) {
    return 'ellos'
  }
  return current
}

export function winnerOf(
  state: CounterState,
  target: number,
): Team | null {
  const nosReached = hasReachedTarget(state, 'nos', target)
  const ellosReached = hasReachedTarget(state, 'ellos', target)
  if (nosReached && ellosReached) {
    const pn = displayPoints(state, 'nos')
    const pe = displayPoints(state, 'ellos')
    if (pn === pe) {
      return null
    }
    return pn > pe ? 'nos' : 'ellos'
  }
  if (nosReached && !ellosReached) {
    return 'nos'
  }
  if (ellosReached && !nosReached) {
    return 'ellos'
  }
  return null
}
