// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import worker from './index'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let juan: string
let code: string

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

beforeEach(async () => {
  env = { DB: createTestDb() }
  juan = await registerTestUser(env, 'juan')
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
      ],
    },
    juan,
  )
  code = ((await response.json()) as { inviteCode: string }).inviteCode
})

describe('seguridad', () => {
  it('un pedido por http se manda a https sin atenderlo', async () => {
    const response = await worker.fetch(
      new Request('http://trucostats.guzmandls.workers.dev/api/yo'),
      env,
    )
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'https://trucostats.guzmandls.workers.dev/api/yo',
    )
  })

  it('las respuestas llevan las cabeceras de seguridad', async () => {
    const response = await send('GET', '/api/salud')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('strict-transport-security')).toContain(
      'max-age=',
    )
  })

  it('solo acepta fotos que son imágenes', async () => {
    const photo = (avatar: unknown) =>
      send('PUT', '/api/yo/foto', { avatar }, juan)
    expect((await photo('data:image/jpeg;base64,AAAA')).status).toBe(200)
    expect((await photo('javascript:alert(1)')).status).toBe(400)
    expect(
      (await photo('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).status,
    ).toBe(400)
    expect((await photo('hola')).status).toBe(400)
  })

  it('los apodos solo los ve quien es del grupo', async () => {
    await send(
      'PUT',
      `/api/grupos/${code}/integrantes/m1/apodos`,
      { aliases: ['Juancho'] },
      juan,
    )
    type Body = { group: { members: { id: string; aliases?: string[] }[] } }
    const member = (await (
      await send('GET', `/api/grupos/${code}`, undefined, juan)
    ).json()) as Body
    expect(member.group.members[0].aliases).toEqual(['Juancho'])

    const outsider = (await (
      await send('GET', `/api/grupos/${code}`)
    ).json()) as Body
    expect(outsider.group.members[0].aliases).toBeUndefined()
  })
})
