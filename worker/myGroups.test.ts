// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env

async function insertGroup(id: string, code: string, userId: string | null) {
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO groups (id, name, admin_member_id, created_at, invite_code) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, id, `${id}-m1`, '2026-01-01T00:00:00.000Z', code),
    env.DB.prepare(
      'INSERT INTO members (id, group_id, name, user_id) VALUES (?, ?, ?, ?)',
    ).bind(`${id}-m1`, id, 'Juan', userId),
  ])
}

beforeEach(() => {
  env = { DB: createTestDb() }
})

describe('GET /api/mis-grupos', () => {
  it('sin sesión responde 401', async () => {
    const response = await request(env, '/api/mis-grupos', { method: 'GET' })
    expect(response.status).toBe(401)
  })

  it('devuelve solo los grupos en los que la cuenta es integrante', async () => {
    const token = await registerTestUser(env, 'juan')
    const me = await request(env, '/api/yo', { method: 'GET' }, token)
    const userId = ((await me.json()) as { user: { id: string } }).user.id
    await insertGroup('g1', 'a'.repeat(32), userId)
    await insertGroup('g2', 'b'.repeat(32), null)

    const response = await request(
      env,
      '/api/mis-grupos',
      { method: 'GET' },
      token,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ inviteCodes: ['a'.repeat(32)] })
  })
})
