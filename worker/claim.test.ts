// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request, joinWithNewAccount } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let code: string
// Un grupo "viejo": llegó al servidor sin ninguna cuenta vinculada.
const GROUP_ID = 'g-viejo'

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

function claim(memberId: unknown, token?: string, groupCode = code) {
  return send('POST', `/api/grupos/${groupCode}/reclamar`, { memberId }, token)
}

interface GroupBody {
  group: { adminMemberIds: string[] }
  claimedMemberIds: string[]
  myMemberId: string | null
}

async function readGroup(token: string): Promise<GroupBody> {
  return (await (
    await send('GET', `/api/grupos/${code}`, undefined, token)
  ).json()) as GroupBody
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  code = 'a'.repeat(32)
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO groups (id, name, admin_member_id, created_at, invite_code) VALUES (?, ?, ?, ?, ?)',
    ).bind(GROUP_ID, 'Los viejos', 'm1', '2026-01-01T00:00:00.000Z', code),
    env.DB.prepare(
      'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)',
    ).bind('m1', GROUP_ID, 'Juan'),
    env.DB.prepare(
      'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)',
    ).bind('m2', GROUP_ID, 'Pedro'),
  ])
})

describe('POST /api/grupos/:código/reclamar', () => {
  it('quien tiene una cuenta reclama su integrante y queda como administrador', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await claim('m1', token)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ memberId: 'm1' })
    const body = await readGroup(token)
    expect(body.myMemberId).toBe('m1')
    expect(body.claimedMemberIds).toEqual(['m1'])
    expect(body.group.adminMemberIds).toEqual(['m1'])
  })

  it('puede reclamar cualquier integrante, que pasa a ser administrador', async () => {
    const token = await registerTestUser(env, 'juan')

    await claim('m2', token)

    expect((await readGroup(token)).group.adminMemberIds).toEqual(['m2'])
  })

  it('si el grupo ya tiene a alguien vinculado, no se puede reclamar', async () => {
    const first = await registerTestUser(env, 'juan')
    await claim('m1', first)
    const second = await registerTestUser(env, 'pedro')

    const response = await claim('m2', second)

    expect(response.status).toBe(409)
  })

  it('aunque otra persona ya se unió con el enlace, el creador todavía puede reclamar y las partidas fluyen entre los dos', async () => {
    // Pedro se une con el enlace antes de que el creador reclame.
    const pedroToken = await joinWithNewAccount(env, code, 'm2')
    const juanToken = await registerTestUser(env, 'juan')

    expect((await claim('m1', juanToken)).status).toBe(200)

    // Ahora los dos están vinculados y se ven las partidas del otro.
    const match = (id: string) => ({
      id,
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
      scores: { nos: 30, ellos: 10 },
    })
    const post = (id: string, token: string) =>
      send('POST', `/api/grupos/${code}/partidas`, match(id), token)
    expect((await post('pj', juanToken)).status).toBe(201)
    expect((await post('pp', pedroToken)).status).toBe(201)
    const list = async (token: string) =>
      (
        (await (
          await send('GET', `/api/grupos/${code}/partidas`, undefined, token)
        ).json()) as { matches: { id: string }[] }
      ).matches
        .map((item) => item.id)
        .sort()
    expect(await list(juanToken)).toEqual(['pj', 'pp'])
    expect(await list(pedroToken)).toEqual(['pj', 'pp'])
  })

  it('no se puede reclamar un integrante que ya eligió otra persona', async () => {
    await joinWithNewAccount(env, code, 'm2')
    const token = await registerTestUser(env, 'juan')

    expect((await claim('m2', token)).status).toBe(409)
  })

  it('exige una cuenta registrada (no sirve sin sesión ni con una invitada)', async () => {
    expect((await claim('m1')).status).toBe(401)
  })

  it('rechaza un integrante inexistente, sin elegir y un grupo inexistente', async () => {
    const token = await registerTestUser(env, 'juan')

    expect((await claim('zzz', token)).status).toBe(404)
    expect((await claim(undefined, token)).status).toBe(400)
    expect((await claim('m1', token, '0'.repeat(32))).status).toBe(404)
  })
})
