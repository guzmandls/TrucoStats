// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env

function post(path: string, body: unknown, token?: string): Promise<Response> {
  return request(
    env,
    path,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    token,
  )
}

async function login(password: string): Promise<string | null> {
  const response = await post('/api/sesion', { identifier: 'juan', password })
  return response.ok
    ? ((await response.json()) as { token: string }).token
    : null
}

beforeEach(() => {
  env = { DB: createTestDb() }
})

describe('POST /api/contrasena', () => {
  it('cambia la contraseña, mantiene esta sesión y cierra las demás', async () => {
    const here = await registerTestUser(env, 'juan')
    const other = (await login('contraseña-segura'))!

    const response = await post(
      '/api/contrasena',
      { current: 'contraseña-segura', password: 'otra-contraseña' },
      here,
    )

    expect(response.status).toBe(200)
    expect(await login('otra-contraseña')).not.toBeNull()
    expect(await login('contraseña-segura')).toBeNull()
    const me = (token: string) =>
      request(env, '/api/yo', { method: 'GET' }, token)
    expect((await me(here)).status).toBe(200)
    expect((await me(other)).status).toBe(401)
  })

  it('con la contraseña actual equivocada no cambia nada', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await post(
      '/api/contrasena',
      { current: 'equivocada', password: 'otra-contraseña' },
      token,
    )

    expect(response.status).toBe(403)
    expect(await login('contraseña-segura')).not.toBeNull()
  })

  it('rechaza una contraseña nueva corta', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await post(
      '/api/contrasena',
      { current: 'contraseña-segura', password: 'corta' },
      token,
    )

    expect(response.status).toBe(400)
  })

  it('sin cuenta registrada responde 401', async () => {
    const response = await post('/api/contrasena', {
      current: 'x',
      password: 'otra-contraseña',
    })
    expect(response.status).toBe(401)
  })
})

describe('POST /api/eliminar-cuenta', () => {
  async function createGroup(
    token: string,
    id: string,
    names: string[],
  ): Promise<string> {
    const response = await post(
      '/api/grupos',
      {
        id,
        name: id,
        adminMemberId: `${id}-0`,
        members: names.map((name, index) => ({ id: `${id}-${index}`, name })),
      },
      token,
    )
    return ((await response.json()) as { inviteCode: string }).inviteCode
  }

  it('con la contraseña equivocada no borra nada', async () => {
    const token = await registerTestUser(env, 'juan')

    const response = await post(
      '/api/eliminar-cuenta',
      { password: 'equivocada' },
      token,
    )

    expect(response.status).toBe(403)
    expect(await login('contraseña-segura')).not.toBeNull()
  })

  it('sale de todos sus grupos y borra la cuenta', async () => {
    const token = await registerTestUser(env, 'juan')
    // Un grupo con otra persona (que pasa a ser administradora) y otro donde
    // estaba solo (que se elimina).
    const shared = await createGroup(token, 'g1', ['Juan', 'Pedro'])
    const joined = await post(`/api/grupos/${shared}/unirse`, {
      memberId: 'g1-1',
    })
    const pedro = ((await joined.json()) as { token: string }).token
    const alone = await createGroup(token, 'g2', ['Juan'])

    const response = await post(
      '/api/eliminar-cuenta',
      { password: 'contraseña-segura' },
      token,
    )

    expect(response.status).toBe(200)
    expect(await login('contraseña-segura')).toBeNull()
    expect(
      (await request(env, '/api/yo', { method: 'GET' }, token)).status,
    ).toBe(401)
    const group = (await (
      await request(env, `/api/grupos/${shared}`, { method: 'GET' }, pedro)
    ).json()) as {
      group: { members: { id: string }[]; adminMemberIds: string[] }
      claimedMemberIds: string[]
    }
    // Su integrante sigue en el grupo (con sus partidas), libre.
    expect(group.group.members.map((member) => member.id)).toEqual([
      'g1-0',
      'g1-1',
    ])
    expect(group.claimedMemberIds).toEqual(['g1-1'])
    expect(group.group.adminMemberIds).toEqual(['g1-1'])
    expect(
      (await request(env, `/api/grupos/${alone}`, { method: 'GET' })).status,
    ).toBe(404)
  })
})
