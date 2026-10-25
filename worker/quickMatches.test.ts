// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let juan: string

const partida = {
  id: 'r1',
  type: 'quick',
  playedAt: '2026-10-20T20:00:00.000Z',
  durationSeconds: 600,
  target: 30,
  winner: 'nos',
  scores: { nos: 30, ellos: 21 },
}

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

async function list(token: string) {
  const response = await send('GET', '/api/partidas-rapidas', undefined, token)
  return ((await response.json()) as { matches: { id: string }[] }).matches
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  juan = await registerTestUser(env, 'juan')
})

describe('partidas rápidas en la cuenta', () => {
  it('se guardan en la cuenta y se listan como partidas rápidas', async () => {
    expect(
      (await send('POST', '/api/partidas-rapidas', partida, juan)).status,
    ).toBe(201)
    const matches = (
      (await (
        await send('GET', '/api/partidas-rapidas', undefined, juan)
      ).json()) as {
        matches: unknown[]
      }
    ).matches
    expect(matches).toEqual([
      {
        id: 'r1',
        type: 'quick',
        groupId: null,
        modality: null,
        playedAt: '2026-10-20T20:00:00.000Z',
        durationSeconds: 600,
        target: 30,
        winner: 'nos',
        teams: { nos: [], ellos: [] },
        scores: { nos: 30, ellos: 21 },
      },
    ])
  })

  it('enviarla dos veces no la duplica', async () => {
    await send('POST', '/api/partidas-rapidas', partida, juan)
    expect(
      (await send('POST', '/api/partidas-rapidas', partida, juan)).status,
    ).toBe(200)
    expect(await list(juan)).toHaveLength(1)
  })

  it('cada cuenta ve solo las suyas, y no puede pisar ni borrar las de otra', async () => {
    await send('POST', '/api/partidas-rapidas', partida, juan)
    const pedro = await registerTestUser(env, 'pedro')
    expect(await list(pedro)).toHaveLength(0)
    expect(
      (await send('POST', '/api/partidas-rapidas', partida, pedro)).status,
    ).toBe(409)
    await send('DELETE', '/api/partidas-rapidas/r1', undefined, pedro)
    expect(await list(juan)).toHaveLength(1)
  })

  it('eliminarla la borra del todo', async () => {
    await send('POST', '/api/partidas-rapidas', partida, juan)
    expect(
      (await send('DELETE', '/api/partidas-rapidas/r1', undefined, juan))
        .status,
    ).toBe(200)
    expect(await list(juan)).toHaveLength(0)
  })

  it('sin cuenta no se puede, y valida la partida', async () => {
    expect((await send('POST', '/api/partidas-rapidas', partida)).status).toBe(
      401,
    )
    expect(
      (
        await send(
          'POST',
          '/api/partidas-rapidas',
          { ...partida, scores: { nos: 10, ellos: 21 } },
          juan,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await send(
          'POST',
          '/api/partidas-rapidas',
          { ...partida, target: 7 },
          juan,
        )
      ).status,
    ).toBe(400)
  })

  it('al eliminar la cuenta se borran sus partidas rápidas', async () => {
    await send('POST', '/api/partidas-rapidas', partida, juan)
    await send(
      'POST',
      '/api/eliminar-cuenta',
      { password: 'contraseña-segura' },
      juan,
    )
    const otra = await registerTestUser(env, 'otra')
    // El id quedó libre: la partida ya no existe.
    expect(
      (await send('POST', '/api/partidas-rapidas', partida, otra)).status,
    ).toBe(201)
  })
})
