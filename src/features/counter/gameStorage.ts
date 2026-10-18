import { GAME_STORE, put, read, remove } from '../../lib/db'
import type { Team } from './counterLogic'
import { isGameContext, quickContext, type GameContext } from './gameContext'

const LEGACY_GAME_KEY = 'current'

export const GAME_VERSION = 1

export interface PersistedGame {
  version: number
  target: number
  firstReached: Team | null
  declined?: boolean
  history: Record<Team, number[]>
  context?: GameContext
}

export type GameSlot = string

export const QUICK_SLOT: GameSlot = 'quick'

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
    game.history !== null &&
    (game.context === undefined || isGameContext(game.context))
  )
}

export function contextOf(game: PersistedGame): GameContext {
  return game.context ?? quickContext()
}

export function groupSlot(groupId: string): GameSlot {
  return `group:${groupId}`
}

export function gameSlot(context: GameContext): GameSlot {
  if (context.type === 'group' && context.groupId !== null) {
    return groupSlot(context.groupId)
  }
  return QUICK_SLOT
}

export function hasMoves(game: PersistedGame): boolean {
  return (
    (game.history.nos ?? []).length > 0 || (game.history.ellos ?? []).length > 0
  )
}

export function gameScore(game: PersistedGame): Record<Team, number> {
  const sum = (amounts: number[] | undefined) =>
    (amounts ?? []).reduce((total, amount) => total + amount, 0)
  return {
    nos: sum(game.history.nos),
    ellos: sum(game.history.ellos),
  }
}

export async function loadGame(slot: GameSlot): Promise<PersistedGame | null> {
  const value = await read<unknown>(GAME_STORE, slot)
  return isPersistedGame(value) ? value : null
}

export function saveGame(slot: GameSlot, game: PersistedGame): Promise<void> {
  return put(GAME_STORE, game, slot)
}

export function clearGame(slot: GameSlot): Promise<void> {
  return remove(GAME_STORE, slot)
}

export async function migrateLegacyGame(): Promise<void> {
  const legacy = await read<unknown>(GAME_STORE, LEGACY_GAME_KEY)
  if (legacy === null) {
    return
  }
  if (isPersistedGame(legacy)) {
    await put(GAME_STORE, legacy, gameSlot(contextOf(legacy)))
  }
  await remove(GAME_STORE, LEGACY_GAME_KEY)
}
