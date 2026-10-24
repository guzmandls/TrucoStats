// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from './groups'
import { LIVE_TTL_MS } from './live'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let token = ''

const ID = '0123456789abcdef0123456789abcdef'

const state = {
  teams: { nos: [], ellos: [] },
  target: 30,
  scores: { nos: 7, ellos: 3 },
  paused: false,
  elapsedSeconds: 60,
  winner: null,
}

function publish(body: unknown, auth: string | undefined = token, id = ID) {
  return request(
    env,
    `/api/en-vivo/${id}`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    auth,
  )
}

function watch(id = ID) {
  return request(env, `/api/en-vivo/${id}`)
}

interface SharedBody {
  live: {
    id: string
    state: typeof state
    status: string
    reason: string | null
  }
}

beforeEach(async () => {
  env = { DB: createTestDb() } as unknown as Env
  token = await registerTestUser(env, 'juan')
})

describe('partida rápida compartida en vivo', () => {
  it('quien tiene cuenta la publica y cualquiera la mira sin cuenta', async () => {
    expect((await publish({ state })).status).toBe(200)
    const response = await watch()
    expect(response.status).toBe(200)
    const body = (await response.json()) as SharedBody
    expect(body.live.state.scores).toEqual({ nos: 7, ellos: 3 })
    expect(body.live.status).toBe('live')
  })

  it('sin cuenta no se puede compartir', async () => {
    expect((await publish({ state }, '')).status).toBe(401)
    expect((await watch()).status).toBe(404)
  })

  it('otra cuenta no puede cambiarla', async () => {
    await publish({ state })
    const other = await registerTestUser(env, 'pedro')
    const response = await publish(
      { state: { ...state, scores: { nos: 0, ellos: 30 } } },
      other,
    )
    expect(response.status).toBe(403)
    const body = (await (await watch()).json()) as SharedBody
    expect(body.live.state.scores.ellos).toBe(3)
  })

  it('terminada, una actualización atrasada no la vuelve a poner en juego', async () => {
    await publish({ state, status: 'canceled', reason: 'Se fue la luz' })
    await publish({ state })
    const body = (await (await watch()).json()) as SharedBody
    expect(body.live.status).toBe('canceled')
    expect(body.live.reason).toBe('Se fue la luz')
  })

  it('una partida que nadie actualiza hace horas ya no se ve', async () => {
    await publish({ state })
    vi.useFakeTimers({ now: Date.now() + LIVE_TTL_MS + 1000 })
    try {
      expect((await watch()).status).toBe(404)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rechaza ids que no son secretos y estados inválidos', async () => {
    expect((await publish({ state }, token, 'corto')).status).toBe(404)
    expect((await publish({ state: 'x' })).status).toBe(400)
    expect((await publish({ state, status: 'otro' })).status).toBe(400)
  })
})
