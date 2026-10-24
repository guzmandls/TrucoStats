// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request, joinWithNewAccount } from './testAuth'
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

interface GroupBody {
  group: { adminMemberIds: string[]; members: { id: string }[] }
  claimedMemberIds: string[]
}

async function readGroup(): Promise<GroupBody> {
  return (await (
    await send('GET', `/api/grupos/${code}`, undefined, adminToken)
  ).json()) as GroupBody
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
})

describe('POST /api/grupos/:código/salir', () => {
  it('libera al integrante, que queda en el grupo para que otra persona lo elija', async () => {
    const response = await send(
      'POST',
      `/api/grupos/${code}/salir`,
      {},
      pedroToken,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deleted: false })
    const body = await readGroup()
    expect(body.group.members.map((member) => member.id)).toEqual(['m1', 'm2'])
    expect(body.claimedMemberIds).toEqual(['m1'])
  })

  it('si sale el único administrador, el rol pasa solo al integrante con cuenta', async () => {
    await send('POST', `/api/grupos/${code}/salir`, {}, adminToken)

    const body = (await (
      await send('GET', `/api/grupos/${code}`, undefined, pedroToken)
    ).json()) as GroupBody
    expect(body.group.adminMemberIds).toEqual(['m2'])
    expect(body.claimedMemberIds).toEqual(['m2'])
  })

  it('si sale el único integrante, el grupo se elimina', async () => {
    await send(
      'DELETE',
      `/api/grupos/${code}/integrantes/m2`,
      undefined,
      adminToken,
    )

    const response = await send(
      'POST',
      `/api/grupos/${code}/salir`,
      {},
      adminToken,
    )

    expect(await response.json()).toEqual({ deleted: true })
    expect((await send('GET', `/api/grupos/${code}`)).status).toBe(404)
  })

  it('rechaza sin sesión y a quien no es integrante', async () => {
    expect((await send('POST', `/api/grupos/${code}/salir`, {})).status).toBe(
      401,
    )
    const stranger = await registerTestUser(env, 'otro')
    expect(
      (await send('POST', `/api/grupos/${code}/salir`, {}, stranger)).status,
    ).toBe(403)
    expect(
      (
        await send(
          'POST',
          `/api/grupos/${'0'.repeat(32)}/salir`,
          {},
          pedroToken,
        )
      ).status,
    ).toBe(404)
  })
})
