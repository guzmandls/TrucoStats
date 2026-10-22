// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { registerTestUser, request } from './testAuth'
import { createTestDb } from './testDb'

let env: Env
let token: string
let code: string

const GROUP_ID = 'g1'
const ADMIN = 'g1-m1'

async function revision(): Promise<number> {
  const row = await env.DB.prepare('SELECT revision FROM groups WHERE id = ?')
    .bind(GROUP_ID)
    .first<{ revision: number }>()
  return row!.revision
}

function get(path: string, tag?: string, as = token): Promise<Response> {
  return request(
    env,
    path,
    { method: 'GET', headers: tag ? { 'if-none-match': tag } : {} },
    as,
  )
}

function sendMatch(id: string): Promise<Response> {
  return request(
    env,
    `/api/grupos/${code}/partidas`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id,
        type: 'group',
        modality: '1v1',
        playedAt: '2026-03-01T20:00:00.000Z',
        durationSeconds: 600,
        target: 30,
        winner: 'nos',
        teams: {
          nos: [{ id: ADMIN, name: 'Juan' }],
          ellos: [{ id: 'g1-m2', name: 'Pedro' }],
        },
        scores: { nos: 30, ellos: 12 },
      }),
    },
    token,
  )
}

beforeEach(async () => {
  env = { DB: createTestDb() }
  token = await registerTestUser(env, 'juan')
  const response = await request(
    env,
    '/api/grupos',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: GROUP_ID,
        name: 'Los del truco',
        adminMemberId: ADMIN,
        createdAt: '2026-01-01T00:00:00.000Z',
        members: [
          { id: ADMIN, name: 'Juan' },
          { id: 'g1-m2', name: 'Pedro' },
        ],
      }),
    },
    token,
  )
  code = ((await response.json()) as { inviteCode: string }).inviteCode
})

describe('versión del grupo', () => {
  it('sube con cualquier cambio de lo que la app descarga', async () => {
    const steps: Array<[string, string]> = [
      ['nombre del grupo', "UPDATE groups SET name = 'Otro' WHERE id = 'g1'"],
      [
        'integrante nuevo',
        "INSERT INTO members (id, group_id, name) VALUES ('g1-m3', 'g1', 'Luis')",
      ],
      [
        'nombre o foto',
        "UPDATE members SET avatar = 'data:x' WHERE id = 'g1-m3'",
      ],
      [
        'apodo nuevo',
        "INSERT INTO member_aliases (group_id, member_id, alias, alias_norm) VALUES ('g1', 'g1-m3', 'Lucho', 'lucho')",
      ],
      ['apodo quitado', "DELETE FROM member_aliases WHERE member_id = 'g1-m3'"],
      [
        'partida nueva',
        "INSERT INTO matches (id, type, group_id, modality, played_at, target, winner, nos_score, ellos_score) VALUES ('p1', 'group', 'g1', '1v1', '2026-03-01', 30, 'nos', 30, 10)",
      ],
      [
        'jugador de la partida',
        "INSERT INTO match_players (match_id, member_id, name, team) VALUES ('p1', 'g1-m1', 'Juan', 'nos')",
      ],
      [
        'nombre en la partida',
        "UPDATE match_players SET name = 'Juancho' WHERE match_id = 'p1'",
      ],
      [
        'partida cancelada',
        "UPDATE matches SET canceled_at = '2026-03-02' WHERE id = 'p1'",
      ],
      ['jugador quitado', "DELETE FROM match_players WHERE match_id = 'p1'"],
      ['partida borrada', "DELETE FROM matches WHERE id = 'p1'"],
      ['integrante borrado', "DELETE FROM members WHERE id = 'g1-m3'"],
    ]
    for (const [what, sql] of steps) {
      const before = await revision()
      await env.DB.prepare(sql).run()
      expect(await revision(), what).toBeGreaterThan(before)
    }
  })

  it('no cambia por lo que no se descarga (por ejemplo, una partida en vivo)', async () => {
    const before = await revision()
    await env.DB.prepare(
      "INSERT INTO live_matches (id, group_id, state, started_at, updated_at) VALUES ('v1', 'g1', '{}', '2026-03-01', '2026-03-01')",
    ).run()
    expect(await revision()).toBe(before)
  })
})

describe('respuestas "sin cambios" (304)', () => {
  for (const [name, path] of [
    ['el grupo', () => `/api/grupos/${code}`],
    ['las partidas', () => `/api/grupos/${code}/partidas`],
  ] as const) {
    it(`${name}: si nada cambió responde 304 sin cuerpo; si cambió, todo de nuevo`, async () => {
      const first = await get(path())
      const tag = first.headers.get('etag')
      expect(first.status).toBe(200)
      expect(tag).toBeTruthy()

      const again = await get(path(), tag!)
      expect(again.status).toBe(304)
      expect(await again.text()).toBe('')

      expect((await sendMatch('p1')).status).toBe(201)
      const changed = await get(path(), tag!)
      expect(changed.status).toBe(200)
      expect(changed.headers.get('etag')).not.toBe(tag)
    })
  }

  it('la versión depende de quién pregunta: otra cuenta recibe la respuesta completa', async () => {
    const tag = (await get(`/api/grupos/${code}`)).headers.get('etag')!
    const other = await registerTestUser(env, 'pedro')

    const response = await get(`/api/grupos/${code}`, tag, other)

    expect(response.status).toBe(200)
    expect(
      ((await response.json()) as { myMemberId: string | null }).myMemberId,
    ).toBeNull()
  })

  it('quien no es integrante no recibe 304 aunque mande una versión válida', async () => {
    const tag = (await get(`/api/grupos/${code}/partidas`)).headers.get('etag')!
    const other = await registerTestUser(env, 'pedro')

    const response = await get(`/api/grupos/${code}/partidas`, tag, other)

    expect(response.status).toBe(403)
  })
})
