import type { Team } from './counterLogic'

const DB_NAME = 'trucostats'
const DB_VERSION = 1
const STORE_NAME = 'game'
const GAME_KEY = 'current'

export const GAME_VERSION = 1

export interface PersistedGame {
  version: number
  target: number
  firstReached: Team | null
  finished: boolean
  history: Record<Team, number[]>
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })
  }
  return dbPromise
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
    typeof game.finished === 'boolean' &&
    (game.firstReached === null || isTeam(game.firstReached)) &&
    typeof game.history === 'object' &&
    game.history !== null
  )
}

export async function loadGame(): Promise<PersistedGame | null> {
  const db = await openDb()
  if (!db) {
    return null
  }
  return new Promise((resolve) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(GAME_KEY)
    request.onsuccess = () => {
      const value = request.result
      resolve(isPersistedGame(value) ? value : null)
    }
    request.onerror = () => resolve(null)
  })
}

export async function saveGame(game: PersistedGame): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(game, GAME_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}

export async function clearGame(): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(GAME_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}
