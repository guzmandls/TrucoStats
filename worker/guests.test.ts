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

interface Player {
  id: string
  name: string
  guest?: true
}

function match(id: string, nos: Player[], ellos: Player[]) {
  return {
    id,
    type: 'group',
    modality: nos.length === 1 ? '1v1' : '2v2',
    playedAt: '2026-10-05T20:00:00.000Z',
    durationSeconds: 600,
    target: 40,
    winner: 'nos',
    teams: { nos, ellos },
    scores: { nos: 40, ellos: 12 },
  }
}

const juan = { id: 'm1', name: 'Juan' }
const pedro = { id: 'm2', name: 'Pedro' }

function postMatch(body: unknown, token = adminToken) {
  return send('POST', `/api/grupos/${code}/partidas`, body, token)
}

interface GroupBody {
  group: { members: { id: string; name: string; aliases?: string[] }[] }
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
      members: [juan, pedro, { id: 'm3', name: 'Luis' }],
    },
    adminToken,
  )
  code = ((await created.json()) as { inviteCode: string }).inviteCode
  pedroToken = await joinWithNewAccount(env, code, 'm2')
})

describe('partidas con jugadores invitados', () => {
  it('guarda y devuelve a los invitados marcados', async () => {
    const response = await postMatch(
      match(
        'p1',
        [juan, { id: 'x1', name: 'Beto', guest: true }],
        [pedro, { id: 'x2', name: 'Lucho', guest: true }],
      ),
    )

    expect(response.status).toBe(201)
    const list = (await (
      await send('GET', `/api/grupos/${code}/partidas`, undefined, adminToken)
    ).json()) as { matches: { teams: { nos: Player[]; ellos: Player[] } }[] }
    expect(list.matches[0].teams.nos).toEqual([
      juan,
      { id: 'x1', name: 'Beto', guest: true },
    ])
    expect(list.matches[0].teams.ellos[1]).toEqual({
      id: 'x2',
      name: 'Lucho',
      guest: true,
    })
  })

  it('cada equipo necesita al menos un integrante del grupo', async () => {
    const onlyGuests = await postMatch(
      match('p2', [juan], [{ id: 'x2', name: 'Lucho', guest: true }]),
    )
    expect(onlyGuests.status).toBe(400)
    expect(((await onlyGuests.json()) as { error: string }).error).toMatch(
      /al menos un integrante/,
    )
  })

  it('un jugador que no es invitado debe ser integrante', async () => {
    const response = await postMatch(
      match('p3', [juan], [{ id: 'zzz', name: 'Nadie' }]),
    )
    expect(response.status).toBe(400)
  })

  it('un invitado no puede usar el id de un integrante', async () => {
    const response = await postMatch(
      match(
        'p4',
        [juan, { id: 'm3', name: 'Luis', guest: true }],
        [pedro, { id: 'x9', name: 'Otro', guest: true }],
      ),
    )
    expect(response.status).toBe(400)
  })
})

describe('PUT /integrantes/:id/apodos', () => {
  function put(memberId: string, aliases: unknown, token = adminToken) {
    return send(
      'PUT',
      `/api/grupos/${code}/integrantes/${memberId}/apodos`,
      { aliases },
      token,
    )
  }

  it('el propio integrante guarda sus apodos y el grupo los devuelve', async () => {
    const response = await put('m2', ['Pedrito', ' Pepe '], pedroToken)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ aliases: ['Pedrito', 'Pepe'] })
    const body = await readGroup()
    expect(
      body.group.members.find((member) => member.id === 'm2')?.aliases,
    ).toEqual(['Pedrito', 'Pepe'])
    expect(
      body.group.members.find((member) => member.id === 'm1')?.aliases,
    ).toBeUndefined()
  })

  it('un administrador puede cambiar los de otro, incluso sacarlos todos', async () => {
    await put('m2', ['Pedrito'], pedroToken)

    expect((await put('m2', [])).status).toBe(200)

    expect(
      (await readGroup()).group.members.find((member) => member.id === 'm2')
        ?.aliases,
    ).toBeUndefined()
  })

  it('un integrante común no puede cambiar los de otro', async () => {
    expect((await put('m1', ['X'], pedroToken)).status).toBe(403)
  })

  it('un apodo no puede repetirse entre integrantes (sin importar tildes ni mayúsculas)', async () => {
    await put('m2', ['Juancho'], pedroToken)

    const response = await put('m1', ['  JUANCHÓ '])

    expect(response.status).toBe(409)
    // El administrador le saca el apodo a quien lo tiene y entonces queda libre.
    await put('m2', [])
    expect((await put('m1', ['Juancho'])).status).toBe(200)
  })

  it('un apodo no puede ser el nombre de otro integrante', async () => {
    expect((await put('m2', ['luis'], pedroToken)).status).toBe(409)
  })

  it('rechaza datos inválidos y a quien no inició sesión', async () => {
    expect((await put('m2', 'Pedrito', pedroToken)).status).toBe(400)
    expect((await put('m2', [''], pedroToken)).status).toBe(400)
    expect((await put('m2', ['a'.repeat(21)], pedroToken)).status).toBe(400)
    expect((await put('m2', ['A'], '')).status).toBe(401)
  })

  it('al dar de baja a un integrante sus apodos quedan libres', async () => {
    await put('m2', ['Pedrito'], pedroToken)
    await send(
      'DELETE',
      `/api/grupos/${code}/integrantes/m2`,
      undefined,
      adminToken,
    )

    expect((await put('m3', ['Pedrito'])).status).toBe(200)
  })
})
