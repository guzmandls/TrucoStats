import { GAME_STORE, put, read, remove } from '../../lib/db'
import type { Team } from './counterLogic'

const GAME_KEY = 'current'

export const GAME_VERSION = 1

export interface PersistedGame {
  version: number
  target: number
  firstReached: Team | null
  declined?: boolean
  history: Record<Team, number[]>
}

function isTeam(value: unknown): value is Team {
  return value === 'nos' || value === 'ellos'
}

function isPersistedGame(value: unknown): value is PersistedGame {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const game = value as Record<string, unknown>
  return (
    game.version === GAME_VERSION &&
    typeof game.target === 'number' &&
    (game.firstReached === null || isTeam(game.firstReached)) &&
    typeof game.history === 'object' &&
    game.history !== null
  )
}

export async function loadGame(): Promise<PersistedGame | null> {
  const value = await read<unknown>(GAME_STORE, GAME_KEY)
  return isPersistedGame(value) ? value : null
}

export function saveGame(game: PersistedGame): Promise<void> {
  return put(GAME_STORE, game, GAME_KEY)
}

export function clearGame(): Promise<void> {
  return remove(GAME_STORE, GAME_KEY)
}
