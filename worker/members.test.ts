// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request, joinWithNewAccount } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
// Sesión de la cuenta que crea el grupo (su administrador).
let token = ''
let code: string

function call(path: string, init?: RequestInit): Promise<Response> {
  return request(env, path, init, token)
}

function send(method: string, path: string, body: unknown): Promise<Response> {
  return call(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const juan = { id: 'm1', name: 'Juan' }
const pedro = { id: 'm2', name: 'Pedro' }

beforeEach(async () => {
  env = { DB: createTestDb() }
  token = await registerTestUser(env)
  const response = await send('POST', '/api/grupos', {
    id: 'g1',
    name: 'Los pibes',
    adminMemberId: 'm1',
    members: [juan, pedro],
  })
  code = ((await response.json()) as { inviteCode: string }).inviteCode
})

function rename(memberId: string, body: unknown, groupCode = code) {
  return send('PATCH', `/api/grupos/${groupCode}/integrantes/${memberId}`, body)
}

describe('PATCH /api/grupos/:código/integrantes/:id', () => {
  it('cambia el nombre del integrante', async () => {
    const response = await rename('m2', { name: '  Pedrito ' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      member: { id: 'm2', name: 'Pedrito' },
    })
    const group = (await (await call(`/api/grupos/${code}`)).json()) as {
      group: { members: { name: string }[] }
    }
    expect(group.group.members.map((member) => member.name)).toEqual([
      'Juan',
      'Pedrito',
    ])
  })

  it('el administrador no puede renombrar a quien ya eligió su lugar, pero esa persona sí', async () => {
    // Pedro elige su lugar con su cuenta.
    const pedroToken = await joinWithNewAccount(env, code, 'm2')

    expect((await rename('m2', { name: 'Pedrito' })).status).toBe(403)

    const own = await request(
      env,
      `/api/grupos/${code}/integrantes/m2`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Pedrito' }),
      },
      pedroToken,
    )
    expect(own.status).toBe(200)
  })

  it('actualiza también el nombre en las partidas ya guardadas', async () => {
    await send('POST', `/api/grupos/${code}/partidas`, {
      id: 'p1',
      type: 'group',
      modality: '1v1',
      playedAt: '2026-10-05T20:00:00.000Z',
      durationSeconds: 600,
      target: 30,
      winner: 'nos',
      teams: { nos: [juan], ellos: [pedro] },
      scores: { nos: 30, ellos: 10 },
    })

    await rename('m2', { name: 'Pedrito' })

    const body = (await (
      await call(`/api/grupos/${code}/partidas`)
    ).json()) as {
      matches: { teams: { ellos: { name: string }[] } }[]
    }
    expect(body.matches[0].teams.ellos[0].name).toBe('Pedrito')
  })

  it.each([
    ['vacío', { name: '   ' }],
    ['demasiado largo', { name: 'x'.repeat(21) }],
    ['que no es texto', { name: 5 }],
    ['sin nombre', {}],
  ])('rechaza un nombre %s', async (_label, body) => {
    const response = await rename('m2', body)

    expect(response.status).toBe(400)
  })

  it('guarda la foto del integrante sin tocar su nombre', async () => {
    const response = await rename('m2', {
      avatar: 'data:image/jpeg;base64,AAA',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      member: { id: 'm2', name: 'Pedro', avatar: 'data:image/jpeg;base64,AAA' },
    })
    const group = (await (await call(`/api/grupos/${code}`)).json()) as {
      group: { members: { avatar?: string }[] }
    }
    expect(group.group.members[1].avatar).toBe('data:image/jpeg;base64,AAA')
  })

  it('quita la foto con null', async () => {
    await rename('m2', { avatar: 'data:image/jpeg;base64,AAA' })
    const response = await rename('m2', { avatar: null })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      member: { id: 'm2', name: 'Pedro' },
    })
  })

  it('rechaza una foto inválida', async () => {
    expect((await rename('m2', { avatar: 5 })).status).toBe(400)
    expect((await rename('m2', { avatar: '' })).status).toBe(400)
  })

  it('rechaza un JSON inválido', async () => {
    const response = await call(`/api/grupos/${code}/integrantes/m2`, {
      method: 'PATCH',
      body: 'no es json',
    })

    expect(response.status).toBe(400)
  })

  it('responde 404 si el integrante no existe en el grupo', async () => {
    const response = await rename('zzz', { name: 'Ana' })

    expect(response.status).toBe(404)
  })

  it('no deja renombrar a un integrante de otro grupo', async () => {
    const other = (await (
      await send('POST', '/api/grupos', {
        id: 'g2',
        name: 'Otros',
        adminMemberId: 'x1',
        members: [{ id: 'x1', name: 'Rita' }],
      })
    ).json()) as { inviteCode: string }

    const response = await rename('x1', { name: 'Hackeada' }, code)
    expect(response.status).toBe(404)
    const stillRita = (await (
      await call(`/api/grupos/${other.inviteCode}`)
    ).json()) as { group: { members: { name: string }[] } }
    expect(stillRita.group.members[0].name).toBe('Rita')
  })

  it('responde 404 con un código de grupo que no existe', async () => {
    const response = await rename('m2', { name: 'Ana' }, '0'.repeat(32))

    expect(response.status).toBe(404)
  })

  it('responde 405 con un método que no corresponde', async () => {
    const response = await call(`/api/grupos/${code}/integrantes/m2`)

    expect(response.status).toBe(405)
  })
})
