// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { ENDED_VISIBLE_MS, LIVE_TTL_MS } from './live'
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

function list(token?: string, groupCode = code) {
  return send('GET', `/api/grupos/${groupCode}/en-vivo`, undefined, token)
}

function publish(liveId: string, body: unknown, token = adminToken) {
  return send('PUT', `/api/grupos/${code}/en-vivo/${liveId}`, body, token)
}

function stop(liveId: string, token = adminToken) {
  return send(
    'DELETE',
    `/api/grupos/${code}/en-vivo/${liveId}`,
    undefined,
    token,
  )
}

interface LiveBody {
  live: {
    id: string
    state: typeof state
    startedAt: string
    updatedAt: string
    ageSeconds: number
    status: 'live' | 'finished' | 'canceled'
    endedAt: string | null
    reason: string | null
  }[]
}

async function lives(token = pedroToken): Promise<LiveBody['live']> {
  return ((await (await list(token)).json()) as LiveBody).live
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

describe('partidas en vivo', () => {
  it('sin partidas publicadas no hay nada para mirar', async () => {
    expect(await lives()).toEqual([])
  })

  it('un integrante publica la partida y otro la ve', async () => {
    expect((await publish('a1', { state })).status).toBe(200)

    const [first] = await lives()

    expect(first.id).toBe('a1')
    expect(first.state).toEqual(state)
    expect(first.updatedAt).toBeTruthy()
  })

  it('puede haber varias partidas en vivo a la vez en el mismo grupo', async () => {
    await publish('a1', { state })
    await publish(
      'b2',
      {
        state: { ...state, scores: { nos: 3, ellos: 5 } },
      },
      pedroToken,
    )

    const all = await lives()

    expect(all.map((live) => live.id)).toEqual(['a1', 'b2'])
    expect(all[1].state.scores).toEqual({ nos: 3, ellos: 5 })
  })

  it('publicar de nuevo actualiza el estado y conserva cuándo empezó', async () => {
    await publish('a1', { state })
    const [first] = await lives()

    await publish('a1', { state: { ...state, scores: { nos: 20, ellos: 8 } } })
    const [second] = await lives()

    expect(second.state.scores).toEqual({ nos: 20, ellos: 8 })
    expect(second.startedAt).toBe(first.startedAt)
  })

  it('al terminar una, las demás siguen', async () => {
    await publish('a1', { state })
    await publish('b2', { state })

    expect((await stop('a1')).status).toBe(200)

    expect((await lives()).map((live) => live.id)).toEqual(['b2'])
  })

  it('si nadie la actualiza durante un rato se ignora', async () => {
    await publish('a1', { state })
    await publish('b2', { state })
    const old = new Date(Date.now() - LIVE_TTL_MS - 1000).toISOString()
    await env.DB.prepare('UPDATE live_matches SET updated_at = ? WHERE id = ?')
      .bind(old, 'a1')
      .run()

    expect((await lives()).map((live) => live.id)).toEqual(['b2'])
  })

  it('sigue en vivo aunque pasen horas, mientras no se cumpla el plazo de abandono', async () => {
    await publish('a1', { state })
    const hours = new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString()
    await env.DB.prepare('UPDATE live_matches SET updated_at = ? WHERE id = ?')
      .bind(hours, 'a1')
      .run()

    const [live] = await lives()

    expect(live.id).toBe('a1')
    expect(live.status).toBe('live')
    expect(live.ageSeconds).toBeGreaterThan(10 * 60 * 60)
  })

  it('informa hace cuánto se actualizó, según el reloj del servidor', async () => {
    await publish('a1', { state })
    const old = new Date(Date.now() - 90_000).toISOString()
    await env.DB.prepare('UPDATE live_matches SET updated_at = ? WHERE id = ?')
      .bind(old, 'a1')
      .run()

    const [live] = await lives()

    expect(live.ageSeconds).toBeGreaterThanOrEqual(90)
    expect(live.ageSeconds).toBeLessThan(100)
  })

  it('una partida terminada se sigue mostrando con ese estado', async () => {
    await publish('a1', { state })
    const final = { ...state, scores: { nos: 30, ellos: 21 }, winner: 'nos' }

    await publish('a1', { state: final, status: 'finished' })

    const [live] = await lives()
    expect(live.status).toBe('finished')
    expect(live.state.scores).toEqual({ nos: 30, ellos: 21 })
    expect(live.endedAt).not.toBeNull()
  })

  it('una partida cancelada se muestra con el motivo', async () => {
    await publish('a1', { state })

    await publish('a1', { state, status: 'canceled', reason: 'Se cargó mal' })

    const [live] = await lives()
    expect(live.status).toBe('canceled')
    expect(live.reason).toBe('Se cargó mal')
  })

  it('una actualización atrasada no resucita una partida terminada', async () => {
    await publish('a1', { state })
    await publish('a1', { state, status: 'canceled' })

    const late = await publish('a1', {
      state: { ...state, scores: { nos: 99, ellos: 0 } },
    })

    expect(late.status).toBe(200)
    const [live] = await lives()
    expect(live.status).toBe('canceled')
    expect(live.state.scores).toEqual({ nos: 12, ellos: 8 })
  })

  it('las terminadas desaparecen pasado un rato', async () => {
    await publish('a1', { state, status: 'finished' })
    await publish('b2', { state })
    const old = new Date(Date.now() - ENDED_VISIBLE_MS - 1000).toISOString()
    await env.DB.prepare('UPDATE live_matches SET ended_at = ? WHERE id = ?')
      .bind(old, 'a1')
      .run()

    expect((await lives()).map((live) => live.id)).toEqual(['b2'])
  })

  it('rechaza un estado final desconocido', async () => {
    expect((await publish('a1', { state, status: 'rota' })).status).toBe(400)
  })

  it('solo la ven y publican los integrantes del grupo', async () => {
    const stranger = await registerTestUser(env, 'otro')

    expect((await list()).status).toBe(401)
    expect((await list(stranger)).status).toBe(403)
    expect((await publish('a1', { state }, stranger)).status).toBe(403)
    expect((await stop('a1', stranger)).status).toBe(403)
    expect((await list(adminToken, '0'.repeat(32))).status).toBe(404)
  })

  it('rechaza un estado inválido o demasiado grande', async () => {
    expect((await publish('a1', {})).status).toBe(400)
    expect((await publish('a1', { state: 'x' })).status).toBe(400)
    expect(
      (await publish('a1', { state: { texto: 'a'.repeat(25_000) } })).status,
    ).toBe(400)
  })

  it('no mezcla partidas de otro grupo con el mismo id', async () => {
    await publish('a1', { state })
    const other = await send(
      'POST',
      '/api/grupos',
      {
        id: 'g2',
        name: 'Otros',
        adminMemberId: 'x1',
        members: [{ id: 'x1', name: 'Ana' }],
      },
      adminToken,
    )
    const otherCode = ((await other.json()) as { inviteCode: string })
      .inviteCode

    const response = await send(
      'PUT',
      `/api/grupos/${otherCode}/en-vivo/a1`,
      { state },
      adminToken,
    )

    expect(response.status).toBe(409)
    expect(await lives()).toHaveLength(1)
  })
})
