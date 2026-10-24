// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request, joinWithNewAccount } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let adminToken: string
let pedroToken: string
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
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    token,
  )
}

const match = {
  id: 'p1',
  type: 'group',
  modality: '1v1',
  playedAt: '2026-10-05T20:00:00.000Z',
  durationSeconds: 600,
  target: 30,
  winner: 'nos',
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
  scores: { nos: 30, ellos: 12 },
}

interface HistoryBody {
  events: {
    action: string
    by: string | null
    reason: string | null
    at: string
  }[]
}

function history(token?: string, matchId = 'p1', groupCode = code) {
  return send(
    'GET',
    `/api/grupos/${groupCode}/partidas/${matchId}/historial`,
    undefined,
    token,
  )
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
  pedroToken = await joinWithNewAccount(env, code, 'm2')
  await send('POST', `/api/grupos/${code}/partidas`, match, pedroToken)
})

describe('GET .../partidas/:id/historial', () => {
  it('una partida sin cambios solo tiene su registro, con quién la registró', async () => {
    const response = await history(adminToken)

    expect(response.status).toBe(200)
    const body = (await response.json()) as HistoryBody
    expect(body.events).toHaveLength(1)
    expect(body.events[0]).toMatchObject({
      action: 'register',
      by: 'Pedro',
      reason: null,
    })
  })

  it('lista las cancelaciones y restauraciones en orden, con quién y por qué', async () => {
    await send(
      'POST',
      `/api/grupos/${code}/partidas/p1/cancelar`,
      { reason: 'Error al contar' },
      adminToken,
    )
    await send(
      'POST',
      `/api/grupos/${code}/partidas/p1/restaurar`,
      undefined,
      adminToken,
    )

    const body = (await (await history(pedroToken)).json()) as HistoryBody

    expect(body.events.map((event) => [event.action, event.by])).toEqual([
      ['register', 'Pedro'],
      ['cancel', 'Juan'],
      ['restore', 'Juan'],
    ])
    expect(body.events[1].reason).toBe('Error al contar')
  })

  it('exige sesión, ser integrante y que exista la partida', async () => {
    expect((await history()).status).toBe(401)
    const stranger = await registerTestUser(env, 'otro')
    expect((await history(stranger)).status).toBe(403)
    expect((await history(adminToken, 'zzz')).status).toBe(404)
    expect((await history(adminToken, 'p1', '0'.repeat(32))).status).toBe(404)
  })
})
