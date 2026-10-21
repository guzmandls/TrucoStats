// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
const CODE = 'c'.repeat(32)

function send(method: string, path: string, body?: unknown, token?: string) {
  return request(
    env,
    path,
    {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    token,
  )
}

async function myMember(token: string): Promise<string | null> {
  const response = await send('GET', `/api/grupos/${CODE}`, undefined, token)
  return ((await response.json()) as { myMemberId: string | null }).myMemberId
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO groups (id, name, admin_member_id, created_at, invite_code) VALUES (?, ?, ?, ?, ?)',
    ).bind('g1', 'Grupo', 'm1', '2026-01-01T00:00:00.000Z', CODE),
    env.DB.prepare(
      'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)',
    ).bind('m1', 'g1', 'Ana'),
    env.DB.prepare(
      'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)',
    ).bind('m2', 'g1', 'Beto'),
  ])
})

describe('iniciar sesión teniendo una cuenta invitada', () => {
  it('el lugar que la invitada eligió pasa a la cuenta con la que inicia sesión', async () => {
    // La cuenta registrada ya existía (creada en otro momento).
    await send('POST', '/api/registro', {
      username: 'beto',
      password: 'contraseña-segura',
    })
    // En el celular se unió como invitado.
    const joined = await send('POST', `/api/grupos/${CODE}/unirse`, {
      memberId: 'm2',
    })
    const guestToken = ((await joined.json()) as { token: string }).token
    expect(await myMember(guestToken)).toBe('m2')

    // Inicia sesión con la cuenta que ya tenía, llevando el token de invitado.
    const login = await send(
      'POST',
      '/api/sesion',
      { identifier: 'beto', password: 'contraseña-segura' },
      guestToken,
    )
    const accountToken = ((await login.json()) as { token: string }).token

    expect(await myMember(accountToken)).toBe('m2')
  })
})
