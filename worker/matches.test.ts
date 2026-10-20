// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import worker from './index'
import type { Env } from './groups'
import { createTestDb } from './testDb'

let env: Env
let code: string

function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://trucostats.test${path}`, init), env)
}

function post(path: string, body: unknown): Promise<Response> {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const juan = { id: 'm1', name: 'Juan' }
const pedro = { id: 'm2', name: 'Pedro' }
const luis = { id: 'm3', name: 'Luis' }
const ana = { id: 'm4', name: 'Ana' }

function buildMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    type: 'group',
    modality: '2v2',
    playedAt: '2026-10-05T20:00:00.000Z',
    durationSeconds: 900,
    target: 30,
    winner: 'nos',
    teams: { nos: [juan, pedro], ellos: [luis, ana] },
    scores: { nos: 30, ellos: 21 },
    ...overrides,
  }
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  const response = await post('/api/grupos', {
    id: 'g1',
    name: 'Los pibes',
    adminMemberId: 'm1',
    members: [juan, pedro, luis, ana],
  })
  code = ((await response.json()) as { inviteCode: string }).inviteCode
})

describe('POST /api/grupos/:código/partidas', () => {
  it('guarda la partida con sus equipos', async () => {
    const response = await post(`/api/grupos/${code}/partidas`, buildMatch())
    const body = (await response.json()) as { match: unknown }

    expect(response.status).toBe(201)
    expect(body.match).toEqual({ ...buildMatch(), groupId: 'g1' })
  })

  it('acepta una duración nula', async () => {
    const response = await post(
      `/api/grupos/${code}/partidas`,
      buildMatch({ durationSeconds: null }),
    )

    expect(response.status).toBe(201)
  })

  it('es idempotente: reenviar la misma partida no la duplica', async () => {
    await post(`/api/grupos/${code}/partidas`, buildMatch())
    const again = await post(`/api/grupos/${code}/partidas`, buildMatch())

    expect(again.status).toBe(200)
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM matches',
    ).first<{
      n: number
    }>()
    expect(count?.n).toBe(1)
  })

  it('responde 409 si el id de la partida pertenece a otro grupo', async () => {
    await post(`/api/grupos/${code}/partidas`, buildMatch())
    const other = (await (
      await post('/api/grupos', {
        id: 'g2',
        name: 'Otros',
        adminMemberId: 'x1',
        members: [
          { id: 'x1', name: 'Rita' },
          { id: 'x2', name: 'Pablo' },
        ],
      })
    ).json()) as { inviteCode: string }

    const response = await post(
      `/api/grupos/${other.inviteCode}/partidas`,
      buildMatch({
        modality: '1v1',
        teams: {
          nos: [{ id: 'x1', name: 'Rita' }],
          ellos: [{ id: 'x2', name: 'Pablo' }],
        },
      }),
    )

    expect(response.status).toBe(409)
  })

  it('responde 404 con un código de grupo que no existe', async () => {
    const response = await post(
      `/api/grupos/${'0'.repeat(32)}/partidas`,
      buildMatch(),
    )

    expect(response.status).toBe(404)
  })

  it('rechaza un JSON inválido', async () => {
    const response = await call(`/api/grupos/${code}/partidas`, {
      method: 'POST',
      body: 'no es json',
    })

    expect(response.status).toBe(400)
  })

  it.each([
    ['rápida', { type: 'quick' }],
    ['sin id', { id: undefined }],
    ['con modalidad inválida', { modality: '4v4' }],
    ['con fecha inválida', { playedAt: 'ayer' }],
    ['con duración negativa', { durationSeconds: -5 }],
    ['con objetivo fuera de rango', { target: 105 }],
    ['con objetivo que no es múltiplo de 5', { target: 33 }],
    ['con puntajes no enteros', { scores: { nos: 30.5, ellos: 21 } }],
    ['con ganador que no tiene más puntos', { winner: 'ellos' }],
    ['con ganador inválido', { winner: 'empate' }],
    [
      'con equipos de otro tamaño que la modalidad',
      { teams: { nos: [juan], ellos: [luis, ana] } },
    ],
    [
      'con un jugador repetido',
      { teams: { nos: [juan, pedro], ellos: [juan, ana] } },
    ],
  ])('rechaza una partida %s', async (_name, overrides) => {
    const response = await post(
      `/api/grupos/${code}/partidas`,
      buildMatch(overrides),
    )

    expect(response.status).toBe(400)
  })

  it('rechaza jugadores que no son integrantes del grupo', async () => {
    const response = await post(
      `/api/grupos/${code}/partidas`,
      buildMatch({
        teams: {
          nos: [juan, pedro],
          ellos: [luis, { id: 'zzz', name: 'Intruso' }],
        },
      }),
    )

    expect(response.status).toBe(400)
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM matches',
    ).first<{
      n: number
    }>()
    expect(count?.n).toBe(0)
  })

  it('responde 405 con un método que no corresponde', async () => {
    const response = await call(`/api/grupos/${code}/partidas`, {
      method: 'DELETE',
    })

    expect(response.status).toBe(405)
  })
})

describe('GET /api/grupos/:código/partidas', () => {
  it('devuelve las partidas del grupo, la más reciente primero', async () => {
    await post(`/api/grupos/${code}/partidas`, buildMatch({ id: 'p1' }))
    await post(
      `/api/grupos/${code}/partidas`,
      buildMatch({
        id: 'p2',
        playedAt: '2026-10-07T20:00:00.000Z',
        winner: 'ellos',
        scores: { nos: 12, ellos: 30 },
      }),
    )

    const response = await call(`/api/grupos/${code}/partidas`)
    const body = (await response.json()) as {
      matches: Array<{ id: string; teams: { nos: unknown[] } }>
    }

    expect(response.status).toBe(200)
    expect(body.matches.map((match) => match.id)).toEqual(['p2', 'p1'])
    expect(body.matches[0].teams.nos).toEqual([juan, pedro])
  })

  it('devuelve una lista vacía si todavía no hay partidas', async () => {
    const response = await call(`/api/grupos/${code}/partidas`)

    expect(await response.json()).toEqual({ matches: [] })
  })

  it('no mezcla las partidas de otros grupos', async () => {
    await post(`/api/grupos/${code}/partidas`, buildMatch())
    const other = (await (
      await post('/api/grupos', {
        id: 'g2',
        name: 'Otros',
        adminMemberId: 'x1',
        members: [{ id: 'x1', name: 'Rita' }],
      })
    ).json()) as { inviteCode: string }

    const body = (await (
      await call(`/api/grupos/${other.inviteCode}/partidas`)
    ).json()) as { matches: unknown[] }

    expect(body.matches).toEqual([])
  })

  it('responde 404 con un código que no existe', async () => {
    const response = await call(`/api/grupos/${'0'.repeat(32)}/partidas`)

    expect(response.status).toBe(404)
  })
})
