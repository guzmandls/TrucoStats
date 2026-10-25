// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let juan: string
let pedro: string
const codes: Record<string, string> = {}

function send(method: string, path: string, body?: unknown, token?: string) {
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

async function createGroup(id: string) {
  const response = await send(
    'POST',
    '/api/grupos',
    {
      id,
      name: `Grupo ${id}`,
      adminMemberId: `${id}-juan`,
      members: [
        { id: `${id}-juan`, name: 'Juan' },
        { id: `${id}-pedro`, name: 'Pedro' },
        { id: `${id}-libre`, name: 'Libre' },
      ],
    },
    juan,
  )
  codes[id] = ((await response.json()) as { inviteCode: string }).inviteCode
}

let matchCount = 0

// Juan contra un rival (Pedro o un invitado), con el ganador indicado.
async function play(
  groupId: string,
  rival: { id: string; name: string; guest?: true },
  juanWins: boolean,
) {
  matchCount += 1
  const id = `p${matchCount}`
  await send(
    'POST',
    `/api/grupos/${codes[groupId]}/partidas`,
    {
      id,
      type: 'group',
      modality: '1v1',
      playedAt: `2026-10-0${matchCount}T20:00:00.000Z`,
      durationSeconds: 600,
      target: 30,
      winner: juanWins ? 'nos' : 'ellos',
      teams: { nos: [{ id: `${groupId}-juan`, name: 'Juan' }], ellos: [rival] },
      scores: juanWins ? { nos: 30, ellos: 10 } : { nos: 10, ellos: 30 },
    },
    juan,
  )
  return id
}

interface Profile {
  personal: {
    total: number
    wins: number
    groups: number
    quick: { total: number; wins: number }
    group: { total: number; wins: number }
  } | null
}

async function profileOf(memberId: string, token = juan, groupId = 'g1') {
  return send(
    'GET',
    `/api/grupos/${codes[groupId]}/integrantes/${memberId}/perfil`,
    undefined,
    token,
  )
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  matchCount = 0
  juan = await registerTestUser(env, 'juan')
  pedro = await registerTestUser(env, 'pedro')
  await createGroup('g1')
  await createGroup('g2')
  for (const id of ['g1', 'g2']) {
    await send(
      'POST',
      `/api/grupos/${codes[id]}/unirse`,
      { memberId: `${id}-pedro` },
      pedro,
    )
  }
})

describe('perfil de otro integrante', () => {
  it('suma sus partidas rápidas y las de todos sus grupos', async () => {
    await play('g1', { id: 'g1-pedro', name: 'Pedro' }, true)
    await play('g2', { id: 'g2-pedro', name: 'Pedro' }, false)
    await send(
      'POST',
      '/api/partidas-rapidas',
      {
        id: 'r1',
        playedAt: '2026-10-09T20:00:00.000Z',
        durationSeconds: 300,
        target: 30,
        winner: 'nos',
        scores: { nos: 30, ellos: 5 },
      },
      pedro,
    )

    const body = (await (await profileOf('g1-pedro')).json()) as Profile
    expect(body.personal).toMatchObject({
      total: 3,
      wins: 2,
      groups: 2,
      quick: { total: 1, wins: 1 },
      group: { total: 2, wins: 1 },
    })
  })

  it('no cuenta las canceladas y sí las anotadas con un apodo', async () => {
    const canceled = await play('g1', { id: 'g1-pedro', name: 'Pedro' }, true)
    await send(
      'POST',
      `/api/grupos/${codes.g1}/partidas/${canceled}/cancelar`,
      { reason: '' },
      juan,
    )
    await send(
      'PUT',
      `/api/grupos/${codes.g1}/integrantes/g1-pedro/apodos`,
      { aliases: ['Pedrito'] },
      pedro,
    )
    // Pedro anotado como invitado "pedrito" (2 contra 2), y ganó su equipo.
    await send(
      'POST',
      `/api/grupos/${codes.g1}/partidas`,
      {
        id: 'apodo',
        type: 'group',
        modality: '2v2',
        playedAt: '2026-10-08T20:00:00.000Z',
        durationSeconds: 600,
        target: 30,
        winner: 'ellos',
        teams: {
          nos: [
            { id: 'g1-juan', name: 'Juan' },
            { id: 'x0', name: 'Otro', guest: true },
          ],
          ellos: [
            { id: 'g1-libre', name: 'Libre' },
            { id: 'x1', name: 'pedrito', guest: true },
          ],
        },
        scores: { nos: 10, ellos: 30 },
      },
      juan,
    )

    const body = (await (await profileOf('g1-pedro')).json()) as Profile
    expect(body.personal).toMatchObject({
      total: 1,
      wins: 1,
      group: { total: 1, wins: 1 },
    })
  })

  it('un lugar que nadie eligió no tiene estadísticas personales', async () => {
    const body = (await (await profileOf('g1-libre')).json()) as Profile
    expect(body.personal).toBeNull()
  })

  it('solo lo ven quienes son del grupo', async () => {
    const other = await registerTestUser(env, 'otra')
    expect((await profileOf('g1-pedro', other)).status).toBe(403)
    expect((await profileOf('no-existe')).status).toBe(404)
  })
})
