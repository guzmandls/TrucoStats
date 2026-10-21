// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
// Sesión de la cuenta que crea el grupo (su administrador).
let token = ''

function call(path: string, init?: RequestInit): Promise<Response> {
  return request(env, path, init, token)
}

function post(path: string, body: unknown): Promise<Response> {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validGroup = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberId: 'm1',
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro', avatar: 'data:image/jpeg;base64,AAAA' },
  ],
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  token = await registerTestUser(env)
})

describe('/api/salud', () => {
  it('responde ok', async () => {
    const response = await call('/api/salud')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ estado: 'ok' })
  })

  it('responde 404 en una ruta de la API que no existe', async () => {
    const response = await call('/api/inexistente')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No encontrado' })
  })
})

describe('POST /api/grupos', () => {
  it('crea el grupo y devuelve un código de invitación', async () => {
    const response = await post('/api/grupos', validGroup)
    const body = (await response.json()) as {
      group: typeof validGroup
      inviteCode: string
    }

    expect(response.status).toBe(201)
    expect(body.group).toEqual(validGroup)
    expect(body.inviteCode).toMatch(/^[0-9a-f]{32}$/)
  })

  it('genera un código distinto para cada grupo', async () => {
    const first = (await (await post('/api/grupos', validGroup)).json()) as {
      inviteCode: string
    }
    const second = (await (
      await post('/api/grupos', {
        ...validGroup,
        id: 'g2',
        members: [{ id: 'm9', name: 'Ana' }],
        adminMemberId: 'm9',
      })
    ).json()) as { inviteCode: string }

    expect(first.inviteCode).not.toBe(second.inviteCode)
  })

  it('usa la fecha actual si la app no envía createdAt', async () => {
    const { createdAt: _omitted, ...withoutDate } = validGroup
    void _omitted
    const response = await post('/api/grupos', withoutDate)
    const body = (await response.json()) as {
      group: { createdAt: string }
    }

    expect(Number.isNaN(Date.parse(body.group.createdAt))).toBe(false)
  })

  it('rechaza un JSON inválido', async () => {
    const response = await call('/api/grupos', {
      method: 'POST',
      body: 'esto no es json',
    })

    expect(response.status).toBe(400)
  })

  it.each([
    ['sin nombre', { ...validGroup, name: '  ' }],
    ['con nombre demasiado largo', { ...validGroup, name: 'x'.repeat(21) }],
    ['sin integrantes', { ...validGroup, members: [] }],
    [
      'con un integrante sin nombre',
      { ...validGroup, members: [{ id: 'm1', name: '' }] },
    ],
    [
      'con ids de integrante repetidos',
      {
        ...validGroup,
        members: [
          { id: 'm1', name: 'Juan' },
          { id: 'm1', name: 'Pedro' },
        ],
      },
    ],
    [
      'con un administrador que no es integrante',
      { ...validGroup, adminMemberId: 'zzz' },
    ],
    ['sin id', { ...validGroup, id: undefined }],
  ])('rechaza un grupo %s', async (_name, body) => {
    const response = await post('/api/grupos', body)

    expect(response.status).toBe(400)
  })

  it('responde 409 si el grupo ya existe y no deja datos a medias', async () => {
    await post('/api/grupos', validGroup)
    const repeated = await post('/api/grupos', {
      ...validGroup,
      name: 'Otro nombre',
    })

    expect(repeated.status).toBe(409)
    const rows = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM members',
    ).first<{
      n: number
    }>()
    expect(rows?.n).toBe(2)
  })

  it('responde 405 si no es POST', async () => {
    const response = await call('/api/grupos')

    expect(response.status).toBe(405)
  })
})

describe('GET /api/grupos/:código', () => {
  it('devuelve el grupo con sus integrantes', async () => {
    const created = (await (await post('/api/grupos', validGroup)).json()) as {
      inviteCode: string
    }

    const response = await call(`/api/grupos/${created.inviteCode}`)
    const body = (await response.json()) as {
      group: typeof validGroup
      inviteCode: string
    }

    expect(response.status).toBe(200)
    expect(body.group).toEqual(validGroup)
    expect(body.inviteCode).toBe(created.inviteCode)
  })

  it('no muestra a los integrantes dados de baja', async () => {
    const created = (await (await post('/api/grupos', validGroup)).json()) as {
      inviteCode: string
    }
    await env.DB.prepare('UPDATE members SET active = 0 WHERE id = ?')
      .bind('m2')
      .run()

    const body = (await (
      await call(`/api/grupos/${created.inviteCode}`)
    ).json()) as { group: { members: { id: string }[] } }

    expect(body.group.members.map((member) => member.id)).toEqual(['m1'])
  })

  it('responde 404 con un código que no existe', async () => {
    const response = await call(`/api/grupos/${'0'.repeat(32)}`)

    expect(response.status).toBe(404)
  })

  it('no permite entrar con el id del grupo en lugar del código', async () => {
    await post('/api/grupos', validGroup)
    const response = await call('/api/grupos/g1')

    expect(response.status).toBe(404)
  })
})
