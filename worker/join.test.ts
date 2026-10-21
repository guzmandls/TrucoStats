// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let adminToken: string
let code: string

const JSON_HEADERS = { 'content-type': 'application/json' }

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
      headers: JSON_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    token,
  )
}

interface Joined {
  token?: string
  user: { id: string; email: string | null; name: string }
  memberId: string
  member: { id: string; name: string }
}

async function join(memberId: string, name?: string, token?: string) {
  return send('POST', `/api/grupos/${code}/unirse`, { memberId, name }, token)
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

interface GroupBody {
  group: { members: { id: string; name: string }[] }
  claimedMemberIds: string[]
  myMemberId: string | null
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  adminToken = await registerTestUser(env)
  const response = await send(
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
  code = ((await response.json()) as { inviteCode: string }).inviteCode
})

describe('crear grupo', () => {
  it('exige una cuenta con correo', async () => {
    const group = {
      id: 'g2',
      name: 'X',
      adminMemberId: 'a',
      members: [{ id: 'a', name: 'A' }],
    }

    expect((await send('POST', '/api/grupos', group)).status).toBe(401)

    const guest = (await (await join('m2')).json()) as Joined
    expect((await send('POST', '/api/grupos', group, guest.token)).status).toBe(
      401,
    )
  })

  it('deja al creador vinculado como administrador', async () => {
    const response = await send(
      'GET',
      `/api/grupos/${code}`,
      undefined,
      adminToken,
    )
    const body = (await response.json()) as GroupBody

    expect(body.myMemberId).toBe('m1')
    expect(body.claimedMemberIds).toEqual(['m1'])
  })
})

describe('POST /api/grupos/:código/unirse', () => {
  it('crea una cuenta invitada y vincula al integrante', async () => {
    const response = await join('m2', 'Pedrito')

    expect(response.status).toBe(200)
    const body = (await response.json()) as Joined
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user).toMatchObject({ email: null, name: 'Pedrito' })
    expect(body.member).toEqual({ id: 'm2', name: 'Pedrito' })

    const group = (await (
      await send('GET', `/api/grupos/${code}`, undefined, body.token)
    ).json()) as GroupBody
    expect(group.myMemberId).toBe('m2')
    expect(group.claimedMemberIds).toEqual(['m1', 'm2'])
    expect(group.group.members[1].name).toBe('Pedrito')
  })

  it('conserva el nombre si no se envía uno nuevo', async () => {
    const body = (await (await join('m2')).json()) as Joined

    expect(body.member.name).toBe('Pedro')
  })

  it('actualiza el nombre en las partidas ya guardadas', async () => {
    await send('POST', `/api/grupos/${code}/partidas`, match, adminToken)
    const guest = (await (await join('m2', 'Pedrito')).json()) as Joined

    const matches = (await (
      await send('GET', `/api/grupos/${code}/partidas`, undefined, guest.token)
    ).json()) as { matches: { teams: { ellos: { name: string }[] } }[] }
    expect(matches.matches[0].teams.ellos[0].name).toBe('Pedrito')
  })

  it('no deja elegir un integrante que ya eligió otra persona', async () => {
    await join('m2')
    const response = await join('m2')

    expect(response.status).toBe(409)
  })

  it('deja volver a elegir el mismo integrante con la misma sesión', async () => {
    const first = (await (await join('m2')).json()) as Joined
    const again = await join('m2', 'Pedro Pérez', first.token)

    expect(again.status).toBe(200)
    expect(((await again.json()) as Joined).token).toBeUndefined()
  })

  it('no deja ser dos integrantes del mismo grupo', async () => {
    const first = (await (await join('m2')).json()) as Joined
    const response = await join('m3', undefined, first.token)

    expect(response.status).toBe(409)
  })

  it('rechaza pedidos inválidos', async () => {
    expect((await send('POST', `/api/grupos/${code}/unirse`, {})).status).toBe(
      400,
    )
    expect((await join('zzz')).status).toBe(404)
    expect((await join('m2', '   ')).status).toBe(400)
    expect(
      (
        await send('POST', `/api/grupos/${'0'.repeat(32)}/unirse`, {
          memberId: 'm2',
        })
      ).status,
    ).toBe(404)
    expect((await send('GET', `/api/grupos/${code}/unirse`)).status).toBe(405)
  })
})

describe('permisos', () => {
  let guest: Joined

  beforeEach(async () => {
    guest = (await (await join('m2')).json()) as Joined
  })

  function rename(memberId: string, token?: string) {
    return send(
      'PATCH',
      `/api/grupos/${code}/integrantes/${memberId}`,
      { name: 'Nuevo' },
      token,
    )
  }

  it('cada integrante puede cambiar su propio nombre', async () => {
    expect((await rename('m2', guest.token)).status).toBe(200)
  })

  it('un integrante no puede cambiar el nombre de otro', async () => {
    expect((await rename('m3', guest.token)).status).toBe(403)
    expect((await rename('m1', guest.token)).status).toBe(403)
  })

  it('el administrador puede cambiar el nombre de cualquiera', async () => {
    expect((await rename('m3', adminToken)).status).toBe(200)
  })

  it('sin sesión no se puede cambiar nada', async () => {
    expect((await rename('m2')).status).toBe(401)
  })

  it('alguien de afuera del grupo no puede cambiar nada', async () => {
    const outsider = await registerTestUser(env, 'otra@correo.com', 'Otra')

    expect((await rename('m2', outsider)).status).toBe(403)
  })

  it('un integrante vinculado puede registrar y ver partidas', async () => {
    const created = await send(
      'POST',
      `/api/grupos/${code}/partidas`,
      match,
      guest.token,
    )
    expect(created.status).toBe(201)

    const listed = await send(
      'GET',
      `/api/grupos/${code}/partidas`,
      undefined,
      guest.token,
    )
    expect(listed.status).toBe(200)
  })

  it('sin sesión o de afuera del grupo no se ven ni se registran partidas', async () => {
    const outsider = await registerTestUser(env, 'otra@correo.com', 'Otra')

    expect(
      (await send('POST', `/api/grupos/${code}/partidas`, match)).status,
    ).toBe(401)
    expect(
      (await send('POST', `/api/grupos/${code}/partidas`, match, outsider))
        .status,
    ).toBe(403)
    expect((await send('GET', `/api/grupos/${code}/partidas`)).status).toBe(401)
    expect(
      (await send('GET', `/api/grupos/${code}/partidas`, undefined, outsider))
        .status,
    ).toBe(403)
  })

  it('guarda quién registró la partida', async () => {
    await send('POST', `/api/grupos/${code}/partidas`, match, guest.token)

    const row = await env.DB.prepare('SELECT created_by FROM matches').first<{
      created_by: string
    }>()
    expect(row?.created_by).toBe(guest.user.id)
  })
})

describe('convertir la cuenta invitada en una cuenta con correo', () => {
  it('conserva el integrante y el historial', async () => {
    const guest = (await (await join('m2')).json()) as Joined
    await send('POST', `/api/grupos/${code}/partidas`, match, guest.token)

    const response = await send(
      'POST',
      '/api/registro',
      {
        email: 'pedro@correo.com',
        password: 'contraseña-segura',
        name: 'Pedro',
      },
      guest.token,
    )

    expect(response.status).toBe(201)
    const upgraded = (await response.json()) as Joined
    expect(upgraded.user.id).toBe(guest.user.id)
    expect(upgraded.user.email).toBe('pedro@correo.com')

    const group = (await (
      await send('GET', `/api/grupos/${code}`, undefined, upgraded.token)
    ).json()) as GroupBody
    expect(group.myMemberId).toBe('m2')
    const login = await send('POST', '/api/sesion', {
      email: 'pedro@correo.com',
      password: 'contraseña-segura',
    })
    expect(login.status).toBe(200)
  })

  it('una cuenta invitada no puede iniciar sesión con correo', async () => {
    await join('m2')
    const login = await send('POST', '/api/sesion', {
      email: 'null',
      password: 'x',
    })

    expect(login.status).toBe(401)
  })
})
