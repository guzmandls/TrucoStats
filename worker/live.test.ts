// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { LIVE_TTL_MS } from './live'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let adminToken = ''
let pedroToken = ''
let code: string

function send(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  return request(
    env,
    path,
    {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    token,
  )
}

const state = {
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
  target: 30,
  scores: { nos: 12, ellos: 8 },
  paused: false,
  elapsedSeconds: 95,
}

function live(token?: string, groupCode = code) {
  return send('GET', `/api/grupos/${groupCode}/en-vivo`, undefined, token)
}

function publish(body: unknown, token = adminToken) {
  return send('PUT', `/api/grupos/${code}/en-vivo`, body, token)
}

interface LiveBody {
  live: { state: typeof state; startedAt: string; updatedAt: string } | null
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  adminToken = await registerTestUser(env)
  const created = await send(
    'POST',
    '/api/grupos',
    {
      id: 'g1',
      name: 'Los pibes',
      adminMemberId: 'm1',
      members: [
        { id: 'm1', name: 'Juan' },
        { id: 'm2', name: 'Pedro' },
      ],
    },
    adminToken,
  )
  code = ((await created.json()) as { inviteCode: string }).inviteCode
  const joined = await send('POST', `/api/grupos/${code}/unirse`, {
    memberId: 'm2',
  })
  pedroToken = ((await joined.json()) as { token: string }).token
})

describe('partida en vivo', () => {
  it('sin partida publicada no hay nada para mirar', async () => {
    const body = (await (await live(pedroToken)).json()) as LiveBody
    expect(body.live).toBeNull()
  })

  it('un integrante publica la partida y otro la ve', async () => {
    expect((await publish({ state })).status).toBe(200)

    const body = (await (await live(pedroToken)).json()) as LiveBody

    expect(body.live?.state).toEqual(state)
    expect(body.live?.updatedAt).toBeTruthy()
  })

  it('publicar de nuevo actualiza el estado y conserva cuándo empezó', async () => {
    await publish({ state })
    const first = (await (await live(adminToken)).json()) as LiveBody

    await publish({ state: { ...state, scores: { nos: 20, ellos: 8 } } })
    const second = (await (await live(adminToken)).json()) as LiveBody

    expect(second.live?.state.scores).toEqual({ nos: 20, ellos: 8 })
    expect(second.live?.startedAt).toBe(first.live?.startedAt)
  })

  it('al terminar deja de mostrarse', async () => {
    await publish({ state })

    expect(
      (
        await send(
          'DELETE',
          `/api/grupos/${code}/en-vivo`,
          undefined,
          adminToken,
        )
      ).status,
    ).toBe(200)

    expect(
      ((await (await live(pedroToken)).json()) as LiveBody).live,
    ).toBeNull()
  })

  it('si nadie la actualiza durante un rato se ignora', async () => {
    await publish({ state })
    const old = new Date(Date.now() - LIVE_TTL_MS - 1000).toISOString()
    await env.DB.prepare('UPDATE live_matches SET updated_at = ?')
      .bind(old)
      .run()

    expect(
      ((await (await live(pedroToken)).json()) as LiveBody).live,
    ).toBeNull()
  })

  it('solo la ven y publican los integrantes del grupo', async () => {
    const stranger = await registerTestUser(env, 'otro')

    expect((await live()).status).toBe(401)
    expect((await live(stranger)).status).toBe(403)
    expect((await publish({ state }, stranger)).status).toBe(403)
    expect((await live(adminToken, '0'.repeat(32))).status).toBe(404)
  })

  it('rechaza un estado inválido o demasiado grande', async () => {
    expect((await publish({})).status).toBe(400)
    expect((await publish({ state: 'x' })).status).toBe(400)
    expect(
      (await publish({ state: { texto: 'a'.repeat(25_000) } })).status,
    ).toBe(400)
  })
})
