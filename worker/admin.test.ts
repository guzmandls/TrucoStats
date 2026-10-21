// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
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

interface GroupBody {
  group: { adminMemberIds: string[]; members: { id: string; name: string }[] }
  claimedMemberIds: string[]
}

async function readGroup(): Promise<GroupBody> {
  const response = await send(
    'GET',
    `/api/grupos/${code}`,
    undefined,
    adminToken,
  )
  return (await response.json()) as GroupBody
}

const members = `/api/grupos/${'CODE'}/integrantes`

function path(suffix = ''): string {
  return members.replace('CODE', code) + suffix
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
        { id: 'm3', name: 'Luis' },
      ],
    },
    adminToken,
  )
  code = ((await created.json()) as { inviteCode: string }).inviteCode
  // Pedro elige su integrante y queda con una cuenta invitada.
  const joined = await send('POST', `/api/grupos/${code}/unirse`, {
    memberId: 'm2',
  })
  pedroToken = ((await joined.json()) as { token: string }).token
})

describe('POST /integrantes (agregar)', () => {
  it('un administrador agrega un integrante nuevo', async () => {
    const response = await send(
      'POST',
      path(),
      { id: 'm4', name: '  Beto ' },
      adminToken,
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      member: { id: 'm4', name: 'Beto' },
    })
    const body = await readGroup()
    expect(body.group.members.map((member) => member.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ])
    expect(body.claimedMemberIds).not.toContain('m4')
  })

  it('rechaza a quien no es administrador, sin sesión y datos inválidos', async () => {
    const body = { id: 'm4', name: 'Beto' }
    expect((await send('POST', path(), body, pedroToken)).status).toBe(403)
    expect((await send('POST', path(), body)).status).toBe(401)
    expect(
      (await send('POST', path(), { id: 'm4', name: ' ' }, adminToken)).status,
    ).toBe(400)
    expect((await send('POST', path(), { name: 'X' }, adminToken)).status).toBe(
      400,
    )
  })

  it('no admite un id repetido', async () => {
    const response = await send(
      'POST',
      path(),
      { id: 'm2', name: 'Otro' },
      adminToken,
    )
    expect(response.status).toBe(409)
  })
})

describe('DELETE /integrantes/:id (dar de baja)', () => {
  it('oculta al integrante del grupo', async () => {
    const response = await send('DELETE', path('/m3'), undefined, adminToken)

    expect(response.status).toBe(200)
    const body = await readGroup()
    expect(body.group.members.map((member) => member.id)).toEqual(['m1', 'm2'])
  })

  it('rechaza a quien no es administrador y los integrantes inexistentes', async () => {
    expect(
      (await send('DELETE', path('/m3'), undefined, pedroToken)).status,
    ).toBe(403)
    expect(
      (await send('DELETE', path('/zzz'), undefined, adminToken)).status,
    ).toBe(404)
  })

  it('no deja al grupo sin integrantes', async () => {
    await send('DELETE', path('/m2'), undefined, adminToken)
    await send('DELETE', path('/m3'), undefined, adminToken)

    const response = await send('DELETE', path('/m1'), undefined, adminToken)
    expect(response.status).toBe(409)
  })

  it('si se da de baja al único administrador, el rol pasa al integrante con cuenta', async () => {
    const response = await send('DELETE', path('/m1'), undefined, adminToken)

    expect(response.status).toBe(200)
    const body = await readGroup()
    expect(body.group.adminMemberIds).toEqual(['m2'])
  })
})

describe('POST /integrantes/:id/liberar', () => {
  it('desvincula a un integrante elegido para que pueda elegirse de nuevo', async () => {
    const response = await send(
      'POST',
      path('/m2/liberar'),
      undefined,
      adminToken,
    )

    expect(response.status).toBe(200)
    expect((await readGroup()).claimedMemberIds).toEqual(['m1'])
    // Ahora otra persona puede elegir ese integrante.
    const again = await send('POST', `/api/grupos/${code}/unirse`, {
      memberId: 'm2',
    })
    expect(again.status).toBe(200)
  })

  it('rechaza liberarse a uno mismo, a un integrante libre y a quien no es administrador', async () => {
    expect(
      (await send('POST', path('/m1/liberar'), undefined, adminToken)).status,
    ).toBe(409)
    expect(
      (await send('POST', path('/m3/liberar'), undefined, adminToken)).status,
    ).toBe(409)
    expect(
      (await send('POST', path('/m2/liberar'), undefined, pedroToken)).status,
    ).toBe(403)
  })

  it('al liberar a un administrador pierde el rol', async () => {
    await send('PUT', path('/m2/administrador'), { admin: true }, adminToken)

    await send('POST', path('/m2/liberar'), undefined, adminToken)

    expect((await readGroup()).group.adminMemberIds).toEqual(['m1'])
  })
})

describe('PUT /integrantes/:id/administrador', () => {
  it('puede haber varios administradores a la vez', async () => {
    const response = await send(
      'PUT',
      path('/m2/administrador'),
      { admin: true },
      adminToken,
    )

    expect(response.status).toBe(200)
    expect((await readGroup()).group.adminMemberIds).toEqual(['m1', 'm2'])
    // El nuevo administrador ya puede administrar.
    const added = await send(
      'POST',
      path(),
      { id: 'm4', name: 'Beto' },
      pedroToken,
    )
    expect(added.status).toBe(201)
  })

  it('solo se puede dar el rol a un integrante que ya eligió una persona', async () => {
    const response = await send(
      'PUT',
      path('/m3/administrador'),
      { admin: true },
      adminToken,
    )
    expect(response.status).toBe(409)
  })

  it('quita el rol a otro administrador, incluso a uno mismo, mientras quede alguno', async () => {
    await send('PUT', path('/m2/administrador'), { admin: true }, adminToken)

    const quitMe = await send(
      'PUT',
      path('/m1/administrador'),
      { admin: false },
      adminToken,
    )

    expect(quitMe.status).toBe(200)
    expect((await readGroup()).group.adminMemberIds).toEqual(['m2'])
  })

  it('el grupo nunca se queda sin administradores', async () => {
    const response = await send(
      'PUT',
      path('/m1/administrador'),
      { admin: false },
      adminToken,
    )
    expect(response.status).toBe(409)
  })

  it('rechaza a quien no es administrador y pedidos incompletos', async () => {
    expect(
      (
        await send(
          'PUT',
          path('/m2/administrador'),
          { admin: true },
          pedroToken,
        )
      ).status,
    ).toBe(403)
    expect(
      (await send('PUT', path('/m2/administrador'), {}, adminToken)).status,
    ).toBe(400)
  })
})
