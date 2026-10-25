// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let juan: string
let pedro: string
const codes: Record<string, string> = {}

const FOTO = 'data:image/jpeg;base64,AAA'
const OTRA = 'data:image/jpeg;base64,BBB'

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

async function createGroup(id: string, token: string, avatar?: string) {
  const response = await send(
    'POST',
    '/api/grupos',
    {
      id,
      name: `Grupo ${id}`,
      adminMemberId: `${id}-a`,
      members: [
        { id: `${id}-a`, name: 'Admin', ...(avatar ? { avatar } : {}) },
        { id: `${id}-b`, name: 'Otro' },
        { id: `${id}-c`, name: 'Libre' },
      ],
    },
    token,
  )
  codes[id] = ((await response.json()) as { inviteCode: string }).inviteCode
}

async function avatarIn(groupId: string, memberId: string, token: string) {
  const response = await send(
    'GET',
    `/api/grupos/${codes[groupId]}`,
    undefined,
    token,
  )
  const body = (await response.json()) as {
    group: { members: { id: string; avatar?: string }[] }
  }
  return body.group.members.find((member) => member.id === memberId)?.avatar
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  juan = await registerTestUser(env, 'juan')
  pedro = await registerTestUser(env, 'pedro')
  // Juan administra g1 y g2; Pedro se une a los dos como "Otro".
  await createGroup('g1', juan)
  await createGroup('g2', juan)
  for (const id of ['g1', 'g2']) {
    await send(
      'POST',
      `/api/grupos/${codes[id]}/unirse`,
      { memberId: `${id}-b` },
      pedro,
    )
  }
})

describe('la foto es de la cuenta', () => {
  it('cambiarla desde el perfil la cambia en todos los grupos', async () => {
    const response = await send('PUT', '/api/yo/foto', { avatar: FOTO }, pedro)
    expect(response.status).toBe(200)
    expect(await avatarIn('g1', 'g1-b', juan)).toBe(FOTO)
    expect(await avatarIn('g2', 'g2-b', juan)).toBe(FOTO)

    const me = (await (
      await send('GET', '/api/yo', undefined, pedro)
    ).json()) as {
      avatar: string | null
    }
    expect(me.avatar).toBe(FOTO)
  })

  it('cambiarla desde un grupo también la cambia en los demás', async () => {
    await send(
      'PATCH',
      `/api/grupos/${codes.g1}/integrantes/g1-b`,
      { avatar: OTRA },
      pedro,
    )
    expect(await avatarIn('g2', 'g2-b', juan)).toBe(OTRA)
  })

  it('quitarla la quita en todos', async () => {
    await send('PUT', '/api/yo/foto', { avatar: FOTO }, pedro)
    await send('PUT', '/api/yo/foto', { avatar: null }, pedro)
    expect(await avatarIn('g1', 'g1-b', juan)).toBeUndefined()
    expect(await avatarIn('g2', 'g2-b', juan)).toBeUndefined()
  })

  it('el administrador no cambia la foto de quien ya eligió su lugar, pero sí la de un integrante libre', async () => {
    const taken = await send(
      'PATCH',
      `/api/grupos/${codes.g1}/integrantes/g1-b`,
      { avatar: FOTO },
      juan,
    )
    expect(taken.status).toBe(403)
    const free = await send(
      'PATCH',
      `/api/grupos/${codes.g1}/integrantes/g1-c`,
      { avatar: FOTO },
      juan,
    )
    expect(free.status).toBe(200)
    expect(await avatarIn('g1', 'g1-c', juan)).toBe(FOTO)
  })

  it('al unirse a otro grupo, su integrante muestra la foto de la cuenta', async () => {
    await send('PUT', '/api/yo/foto', { avatar: FOTO }, pedro)
    await createGroup('g3', juan)
    await send(
      'POST',
      `/api/grupos/${codes.g3}/unirse`,
      { memberId: 'g3-b' },
      pedro,
    )
    expect(await avatarIn('g3', 'g3-b', juan)).toBe(FOTO)
  })

  it('sin foto en la cuenta, la que le puso el administrador pasa a ser la suya', async () => {
    await createGroup('g3', juan)
    await send(
      'PATCH',
      `/api/grupos/${codes.g3}/integrantes/g3-c`,
      { avatar: OTRA },
      juan,
    )
    await send(
      'POST',
      `/api/grupos/${codes.g3}/unirse`,
      { memberId: 'g3-c' },
      pedro,
    )
    expect(await avatarIn('g1', 'g1-b', juan)).toBe(OTRA)
  })

  it('al salir del grupo su foto se va con la persona', async () => {
    await send('PUT', '/api/yo/foto', { avatar: FOTO }, pedro)
    await send('POST', `/api/grupos/${codes.g1}/salir`, {}, pedro)
    expect(await avatarIn('g1', 'g1-b', juan)).toBeUndefined()
    expect(await avatarIn('g2', 'g2-b', juan)).toBe(FOTO)
  })

  it('el creador del grupo muestra la foto de su cuenta', async () => {
    await send('PUT', '/api/yo/foto', { avatar: FOTO }, juan)
    await createGroup('g3', juan, OTRA)
    expect(await avatarIn('g3', 'g3-a', juan)).toBe(FOTO)
  })

  it('sin sesión no se puede cambiar, y una foto inválida se rechaza', async () => {
    expect((await send('PUT', '/api/yo/foto', { avatar: FOTO })).status).toBe(
      401,
    )
    expect(
      (await send('PUT', '/api/yo/foto', { avatar: 5 }, pedro)).status,
    ).toBe(400)
  })
})
