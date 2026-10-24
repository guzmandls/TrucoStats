// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request, joinWithNewAccount } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let adminToken: string
let pedroToken: string
let luisToken: string
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

function match(id: string) {
  return {
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
    scores: { nos: 30, ellos: 12 },
  }
}

interface MatchBody {
  match: {
    id: string
    createdBy?: string
    registeredAt?: string
    canceled?: { at: string; by: string | null; reason: string | null }
  }
}

function cancel(matchId: string, token?: string, body?: unknown) {
  return send(
    'POST',
    `/api/grupos/${code}/partidas/${matchId}/cancelar`,
    body,
    token,
  )
}

function restore(matchId: string, token?: string) {
  return send(
    'POST',
    `/api/grupos/${code}/partidas/${matchId}/restaurar`,
    undefined,
    token,
  )
}

async function listed() {
  const response = await send(
    'GET',
    `/api/grupos/${code}/partidas`,
    undefined,
    adminToken,
  )
  return ((await response.json()) as { matches: MatchBody['match'][] }).matches
}

function join(memberId: string): Promise<string> {
  return joinWithNewAccount(env, code, memberId)
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
  pedroToken = await join('m2')
  luisToken = await join('m3')
  // Pedro registra la partida p1.
  await send('POST', `/api/grupos/${code}/partidas`, match('p1'), pedroToken)
})

describe('las partidas dicen quién las registró', () => {
  it('incluye al integrante que la registró y no está cancelada', async () => {
    const [first] = await listed()

    expect(first.createdBy).toBe('m2')
    expect(first.canceled).toBeUndefined()
  })
})

describe('POST .../partidas/:id/cancelar', () => {
  it('el administrador cancela y queda registrado quién, cuándo y por qué', async () => {
    const response = await cancel('p1', adminToken, {
      reason: ' Error al contar ',
    })

    expect(response.status).toBe(200)
    const { match: canceled } = (await response.json()) as MatchBody
    expect(canceled.canceled).toMatchObject({
      by: 'm1',
      reason: 'Error al contar',
    })
    expect(canceled.canceled?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect((await listed())[0].canceled?.by).toBe('m1')
  })

  it('quien registró la partida también puede cancelarla, sin motivo', async () => {
    const response = await cancel('p1', pedroToken)

    expect(response.status).toBe(200)
    const { match: canceled } = (await response.json()) as MatchBody
    expect(canceled.canceled).toMatchObject({ by: 'm2', reason: null })
  })

  it('otro integrante no puede cancelarla', async () => {
    expect((await cancel('p1', luisToken)).status).toBe(403)
    expect((await listed())[0].canceled).toBeUndefined()
  })

  it('sin sesión o de afuera del grupo no se puede', async () => {
    const outsider = await registerTestUser(env, 'otra')

    expect((await cancel('p1')).status).toBe(401)
    expect((await cancel('p1', outsider)).status).toBe(403)
  })

  it('cancelar dos veces no cambia nada y no duplica el registro', async () => {
    await cancel('p1', adminToken, { reason: 'Primera' })
    const again = await cancel('p1', adminToken, { reason: 'Segunda' })

    expect(again.status).toBe(200)
    expect(((await again.json()) as MatchBody).match.canceled?.reason).toBe(
      'Primera',
    )
    const events = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM match_events',
    ).first<{ total: number }>()
    expect(events?.total).toBe(1)
  })

  it('rechaza un motivo demasiado largo o que no es texto', async () => {
    expect(
      (await cancel('p1', adminToken, { reason: 'x'.repeat(201) })).status,
    ).toBe(400)
    expect((await cancel('p1', adminToken, { reason: 5 })).status).toBe(400)
  })

  it('responde 404 con una partida o un grupo que no existen', async () => {
    expect((await cancel('zzz', adminToken)).status).toBe(404)
    const response = await send(
      'POST',
      `/api/grupos/${'0'.repeat(32)}/partidas/p1/cancelar`,
      undefined,
      adminToken,
    )
    expect(response.status).toBe(404)
  })

  it('responde 405 con un método que no corresponde', async () => {
    const response = await send(
      'GET',
      `/api/grupos/${code}/partidas/p1/cancelar`,
      undefined,
      adminToken,
    )

    expect(response.status).toBe(405)
  })
})

describe('POST .../partidas/:id/restaurar', () => {
  beforeEach(async () => {
    await cancel('p1', pedroToken, { reason: 'Me equivoqué' })
  })

  it('el administrador restaura y la partida vuelve a contar', async () => {
    const response = await restore('p1', adminToken)

    expect(response.status).toBe(200)
    expect(
      ((await response.json()) as MatchBody).match.canceled,
    ).toBeUndefined()
    expect((await listed())[0].canceled).toBeUndefined()
  })

  it('quien la canceló también puede restaurarla', async () => {
    expect((await restore('p1', pedroToken)).status).toBe(200)
  })

  it('otro integrante no puede restaurarla', async () => {
    expect((await restore('p1', luisToken)).status).toBe(403)
    expect((await listed())[0].canceled).toBeDefined()
  })

  it('restaurar una partida que no está cancelada no cambia nada', async () => {
    await restore('p1', adminToken)
    const again = await restore('p1', adminToken)

    expect(again.status).toBe(200)
  })

  it('cada cancelación y restauración queda en el registro', async () => {
    await restore('p1', adminToken)
    await cancel('p1', adminToken, { reason: 'Otra vez' })

    const { results } = await env.DB.prepare(
      'SELECT action, reason FROM match_events ORDER BY id',
    ).all<{ action: string; reason: string | null }>()
    expect(results).toEqual([
      { action: 'cancel', reason: 'Me equivoqué' },
      { action: 'restore', reason: null },
      { action: 'cancel', reason: 'Otra vez' },
    ])
  })
})

const HOUR = 60 * 60 * 1000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

describe('plazo de una hora para quien no es administrador', () => {
  it('quien registró la partida ya no puede cancelarla pasada la hora', async () => {
    await env.DB.prepare('UPDATE matches SET registered_at = ?')
      .bind(ago(HOUR + 60_000))
      .run()

    const response = await cancel('p1', pedroToken)

    expect(response.status).toBe(403)
    expect(((await response.json()) as { error: string }).error).toContain(
      'Pasó la hora',
    )
    expect((await listed())[0].canceled).toBeUndefined()
  })

  it('dentro de la hora sí puede', async () => {
    await env.DB.prepare('UPDATE matches SET registered_at = ?')
      .bind(ago(HOUR - 60_000))
      .run()

    expect((await cancel('p1', pedroToken)).status).toBe(200)
  })

  it('el administrador cancela una partida de hace meses', async () => {
    await env.DB.prepare('UPDATE matches SET registered_at = ?')
      .bind(ago(60 * 24 * HOUR))
      .run()

    expect((await cancel('p1', adminToken)).status).toBe(200)
  })

  it('una partida sin fecha de registro se considera vencida para quien no es administrador', async () => {
    await env.DB.prepare('UPDATE matches SET registered_at = NULL').run()

    expect((await cancel('p1', pedroToken)).status).toBe(403)
    expect((await cancel('p1', adminToken)).status).toBe(200)
  })

  it('quien canceló tiene una hora desde la cancelación para restaurar', async () => {
    await cancel('p1', pedroToken)
    await env.DB.prepare('UPDATE matches SET canceled_at = ?')
      .bind(ago(HOUR + 60_000))
      .run()

    const response = await restore('p1', pedroToken)

    expect(response.status).toBe(403)
    expect((await listed())[0].canceled).toBeDefined()
    expect((await restore('p1', adminToken)).status).toBe(200)
  })

  it('el plazo de restaurar cuenta desde la cancelación y no desde la partida', async () => {
    await env.DB.prepare('UPDATE matches SET registered_at = ?')
      .bind(ago(5 * HOUR))
      .run()
    await env.DB.prepare(
      'UPDATE matches SET canceled_at = ?, canceled_by = (SELECT user_id FROM members WHERE id = ?)',
    )
      .bind(ago(60_000), 'm2')
      .run()

    expect((await restore('p1', pedroToken)).status).toBe(200)
  })

  it('las partidas informan cuándo las recibió el servidor', async () => {
    const [first] = await listed()

    expect(first.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
