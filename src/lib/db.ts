const DB_NAME = 'trucostats'
const DB_VERSION = 4

export const GAME_STORE = 'game'
export const GROUPS_STORE = 'groups'
export const MATCHES_STORE = 'matches'

const STORE_PARAMETERS: Record<string, IDBObjectStoreParameters> = {
  [GAME_STORE]: {},
  [GROUPS_STORE]: { keyPath: 'id' },
  [MATCHES_STORE]: { keyPath: 'id' },
}

const LEGACY_STORES = ['finishedGames']

let dbPromise: Promise<IDBDatabase | null> | null = null

export function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        for (const [name, parameters] of Object.entries(STORE_PARAMETERS)) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, parameters)
          }
        }
        for (const legacy of LEGACY_STORES) {
          if (db.objectStoreNames.contains(legacy)) {
            db.deleteObjectStore(legacy)
          }
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })
  }
  return dbPromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}

export async function readAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb()
  if (!db) {
    return []
  }
  const result = await requestResult(
    db.transaction(storeName, 'readonly').objectStore(storeName).getAll(),
  )
  return (result as T[] | null) ?? []
}

export async function read<T>(
  storeName: string,
  key: IDBValidKey,
): Promise<T | null> {
  const db = await openDb()
  if (!db) {
    return null
  }
  return requestResult<T>(
    db.transaction(storeName, 'readonly').objectStore(storeName).get(key),
  )
}

export async function put(
  storeName: string,
  value: unknown,
  key?: IDBValidKey,
): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  if (key === undefined) {
    store.put(value)
  } else {
    store.put(value, key)
  }
  await transactionDone(transaction)
}

export async function remove(
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(key)
  await transactionDone(transaction)
}
