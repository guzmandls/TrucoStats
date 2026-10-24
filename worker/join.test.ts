// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join as joinPath } from 'node:path'
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
  user: {
    id: string
    username: string | null
    email: string | null
    name: string
  }
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
  it('exige una cuenta registrada', async () => {
    const group = {
      id: 'g2',
      name: 'X',
      adminMemberId: 'a',
      members: [{ id: 'a', name: 'A' }],
    }

    expect((await send('POST', '/api/grupos', group)).status).toBe(401)
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
  let pedro: string

  beforeEach(async () => {
    pedro = await registerTestUser(env, 'pedro')
  })

  it('exige una cuenta registrada: sin sesión no se puede elegir a nadie', async () => {
    const response = await join('m2')

    expect(response.status).toBe(401)
    const group = (await (
      await send('GET', `/api/grupos/${code}`, undefined, adminToken)
    ).json()) as GroupBody
    expect(group.claimedMemberIds).toEqual(['m1'])
  })

  it('vincula al integrante con la cuenta', async () => {
    const response = await join('m2', 'Pedrito', pedro)

    expect(response.status).toBe(200)
    const body = (await response.json()) as Joined
    expect(body.user.username).toBe('pedro')
    expect(body.member).toEqual({ id: 'm2', name: 'Pedrito' })

    const group = (await (
      await send('GET', `/api/grupos/${code}`, undefined, pedro)
    ).json()) as GroupBody
    expect(group.myMemberId).toBe('m2')
    expect(group.claimedMemberIds).toEqual(['m1', 'm2'])
    expect(group.group.members[1].name).toBe('Pedrito')
  })

  it('conserva el nombre si no se envía uno nuevo', async () => {
    const body = (await (await join('m2', undefined, pedro)).json()) as Joined

    expect(body.member.name).toBe('Pedro')
  })

  it('actualiza el nombre en las partidas ya guardadas', async () => {
    await send('POST', `/api/grupos/${code}/partidas`, match, adminToken)
    await join('m2', 'Pedrito', pedro)

    const matches = (await (
      await send('GET', `/api/grupos/${code}/partidas`, undefined, pedro)
    ).json()) as { matches: { teams: { ellos: { name: string }[] } }[] }
    expect(matches.matches[0].teams.ellos[0].name).toBe('Pedrito')
  })

  it('no deja elegir un integrante que ya eligió otra persona', async () => {
    await join('m2', undefined, pedro)
    const other = await registerTestUser(env, 'otra')

    expect((await join('m2', undefined, other)).status).toBe(409)
  })

  it('deja volver a elegir el mismo integrante con la misma cuenta', async () => {
    await join('m2', undefined, pedro)

    expect((await join('m2', 'Pedro Pérez', pedro)).status).toBe(200)
  })

  it('no deja ser dos integrantes del mismo grupo', async () => {
    await join('m2', undefined, pedro)

    expect((await join('m3', undefined, pedro)).status).toBe(409)
  })

  it('rechaza pedidos inválidos', async () => {
    expect(
      (await send('POST', `/api/grupos/${code}/unirse`, {}, pedro)).status,
    ).toBe(400)
    expect((await join('zzz', undefined, pedro)).status).toBe(404)
    expect((await join('m2', '   ', pedro)).status).toBe(400)
    expect(
      (
        await send(
          'POST',
          `/api/grupos/${'0'.repeat(32)}/unirse`,
          { memberId: 'm2' },
          pedro,
        )
      ).status,
    ).toBe(404)
    expect((await send('GET', `/api/grupos/${code}/unirse`)).status).toBe(405)
  })
})

describe('permisos', () => {
  let pedro: string
  let pedroId: string

  beforeEach(async () => {
    pedro = await registerTestUser(env, 'pedro')
    const joined = (await (await join('m2', undefined, pedro)).json()) as Joined
    pedroId = joined.user.id
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
    expect((await rename('m2', pedro)).status).toBe(200)
  })

  it('un integrante no puede cambiar el nombre de otro', async () => {
    expect((await rename('m3', pedro)).status).toBe(403)
    expect((await rename('m1', pedro)).status).toBe(403)
  })

  it('el administrador puede cambiar el nombre de cualquiera', async () => {
    expect((await rename('m3', adminToken)).status).toBe(200)
  })

  it('sin sesión no se puede cambiar nada', async () => {
    expect((await rename('m2')).status).toBe(401)
  })

  it('alguien de afuera del grupo no puede cambiar nada', async () => {
    const outsider = await registerTestUser(env, 'otra')

    expect((await rename('m2', outsider)).status).toBe(403)
  })

  it('un integrante vinculado puede registrar y ver partidas', async () => {
    const created = await send(
      'POST',
      `/api/grupos/${code}/partidas`,
      match,
      pedro,
    )
    expect(created.status).toBe(201)

    const listed = await send(
      'GET',
      `/api/grupos/${code}/partidas`,
      undefined,
      pedro,
    )
    expect(listed.status).toBe(200)
  })

  it('sin sesión o de afuera del grupo no se ven ni se registran partidas', async () => {
    const outsider = await registerTestUser(env, 'otra')

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
    await send('POST', `/api/grupos/${code}/partidas`, match, pedro)

    const row = await env.DB.prepare('SELECT created_by FROM matches').first<{
      created_by: string
    }>()
    expect(row?.created_by).toBe(pedroId)
  })
})

describe('migración 0012: integrantes de cuentas invitadas', () => {
  it('quedan libres y las sesiones de esas cuentas se cierran', async () => {
    // Una cuenta invitada de antes, con su integrante y su sesión.
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, name, created_at) VALUES ('inv', 'Beto', '2026-01-01')",
      ),
      env.DB.prepare(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ('h', 'inv', '2026-01-01', '2099-01-01')",
      ),
      env.DB.prepare("UPDATE members SET user_id = 'inv' WHERE id = 'm2'"),
    ])

    const migration = readFileSync(
      joinPath(
        import.meta.dirname,
        '..',
        'migrations',
        '0012_sin_invitados_en_grupos.sql',
      ),
      'utf8',
    )
    for (const statement of migration
      .replace(/--.*$/gm, '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)) {
      await env.DB.prepare(statement).run()
    }

    const member = await env.DB.prepare(
      "SELECT user_id FROM members WHERE id = 'm2'",
    ).first<{ user_id: string | null }>()
    expect(member?.user_id).toBeNull()
    const sessions = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM sessions WHERE user_id = 'inv'",
    ).first<{ total: number }>()
    expect(sessions?.total).toBe(0)
    // El administrador sigue siéndolo.
    const admin = await env.DB.prepare(
      "SELECT is_admin FROM members WHERE id = 'm1'",
    ).first<{ is_admin: number }>()
    expect(admin?.is_admin).toBe(1)
  })
})
