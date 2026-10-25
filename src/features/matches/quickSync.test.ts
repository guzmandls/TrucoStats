import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { deleteMatch, loadMatches, saveMatch } from './matchesStorage'
import {
  clearAccountQuickMatches,
  pullQuickMatches,
  removeQuickMatch,
  syncQuickMatches,
} from './quickSync'
import type { Match } from './types'

function quick(id: string, extra: Partial<Match> = {}): Match {
  return {
    id,
    type: 'quick',
    groupId: null,
    modality: null,
    playedAt: '2026-10-20T20:00:00.000Z',
    durationSeconds: 600,
    target: 30,
    winner: 'nos',
    teams: { nos: [], ellos: [] },
    scores: { nos: 30, ellos: 12 },
    ...extra,
  }
}

let calls: { method: string; path: string }[]
let online: boolean
let remote: Match[]

beforeEach(async () => {
  for (const match of await loadMatches()) {
    await deleteMatch(match.id)
  }
  calls = []
  online = true
  remote = []
  saveSession({
    token: 't'.repeat(64),
    user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      calls.push({ method, path })
      if (!online) {
        throw new TypeError('sin conexión')
      }
      if (method === 'GET') {
        return new Response(JSON.stringify({ matches: remote }), {
          status: 200,
        })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
  localStorage.clear()
})

describe('partidas rápidas en la cuenta (app)', () => {
  it('sube las que no están en la cuenta y las marca como enviadas', async () => {
    await saveMatch(quick('r1'))
    await syncQuickMatches()

    expect(calls).toEqual([{ method: 'POST', path: '/api/partidas-rapidas' }])
    expect((await loadMatches())[0].syncedAt).toBeDefined()
  })

  it('sin cuenta no sube nada', async () => {
    clearSession()
    await saveMatch(quick('r1'))
    await syncQuickMatches()
    expect(calls).toHaveLength(0)
  })

  it('trae las de otros celulares y quita las eliminadas desde otro', async () => {
    await saveMatch(quick('vieja', { syncedAt: '2026-10-20T21:00:00.000Z' }))
    await saveMatch(quick('sin-subir'))
    remote = [quick('otra')]

    await pullQuickMatches()

    const ids = (await loadMatches()).map((match) => match.id).sort()
    expect(ids).toEqual(['otra', 'sin-subir'])
  })

  it('eliminar sin conexión la borra del celular y del servidor después', async () => {
    const match = quick('r1', { syncedAt: '2026-10-20T21:00:00.000Z' })
    await saveMatch(match)
    online = false
    await removeQuickMatch(match)
    expect(await loadMatches()).toHaveLength(0)

    // Al traer de nuevo no reaparece, y al sincronizar se borra del servidor.
    online = true
    remote = [match]
    await pullQuickMatches()
    expect(await loadMatches()).toHaveLength(0)
    await syncQuickMatches()
    expect(calls).toContainEqual({
      method: 'DELETE',
      path: '/api/partidas-rapidas/r1',
    })
  })

  it('al cerrar sesión se quitan las de la cuenta y quedan las no subidas', async () => {
    await saveMatch(quick('subida', { syncedAt: '2026-10-20T21:00:00.000Z' }))
    await saveMatch(quick('sin-subir'))
    await clearAccountQuickMatches()
    expect((await loadMatches()).map((match) => match.id)).toEqual([
      'sin-subir',
    ])
  })
})
