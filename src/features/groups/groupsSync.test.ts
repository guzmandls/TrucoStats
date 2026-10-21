import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { pullGroup, syncGroup } from './groupsSync'
import { isPending } from './matchesSync'
import type { Group } from './types'

const CODE = 'abc123'

const local: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
  ],
  inviteCode: CODE,
  myMemberId: 'm1',
}

function match(id: string, playedAt: string, opponent = 'Pedro'): Match {
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: '1v1',
    playedAt,
    durationSeconds: 600,
    target: 30,
    winner: 'nos',
    teams: {
      nos: [{ id: 'm1', name: 'Juan' }],
      ellos: [{ id: 'm2', name: opponent }],
    },
    scores: { nos: 30, ellos: 20 },
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

// Un servidor falso: lo que devuelve para el grupo y sus partidas.
function stubServer(remote: Group, matches: Match[]) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return json({ match: {} }, 201)
    }
    return url.endsWith('/partidas')
      ? json({ matches })
      : json({ group: remote, inviteCode: CODE })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pullGroup', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    await saveGroup(local)
  })

  it('completa quién es esta persona si el celular no lo tenía guardado', async () => {
    const { myMemberId, ...withoutMe } = local
    void myMemberId
    await saveGroup(withoutMe)
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) =>
        String(input).endsWith('/partidas')
          ? json({ matches: [] })
          : json({ group: local, inviteCode: CODE, myMemberId: 'm1' }),
      ),
    )

    expect(await pullGroup('g1')).toBe(true)

    expect((await loadGroups())[0].myMemberId).toBe('m1')
  })

  it('trae los cambios del grupo (como una foto nueva) aunque las partidas no se puedan traer', async () => {
    const withPhoto: Group = {
      ...local,
      members: [
        local.members[0],
        { ...local.members[1], avatar: 'data:image/jpeg;base64,AAA' },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) =>
        String(input).endsWith('/partidas')
          ? json({ error: 'No eres integrante de este grupo' }, 403)
          : json({ group: withPhoto, inviteCode: CODE, myMemberId: 'm1' }),
      ),
    )

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadGroups()
    expect(saved.members[1].avatar).toBe('data:image/jpeg;base64,AAA')
  })

  it('reintenta enviar la foto propia que no había llegado, sin que el servidor la pise', async () => {
    const mine = {
      ...local,
      members: [
        { ...local.members[0], avatar: 'data:image/jpeg;base64,NUEVA' },
        local.members[1],
      ],
    }
    await saveGroup(mine)
    localStorage.setItem('trucostats.pendingAvatar.g1', '1')
    const calls: { method: string; url: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input, init) => {
        const url = String(input)
        calls.push({ method: init?.method ?? 'GET', url })
        if (init?.method === 'PATCH') {
          return json({ member: {} })
        }
        return url.endsWith('/partidas')
          ? json({ matches: [] })
          : json({
              group: {
                ...local,
                members: [
                  {
                    ...local.members[0],
                    avatar: 'data:image/jpeg;base64,NUEVA',
                  },
                  local.members[1],
                ],
              },
              inviteCode: CODE,
              myMemberId: 'm1',
            })
      }),
    )

    await pullGroup('g1')

    expect(calls[0]).toEqual({
      method: 'PATCH',
      url: `/api/grupos/${CODE}/integrantes/m1`,
    })
    expect(localStorage.getItem('trucostats.pendingAvatar.g1')).toBeNull()
    expect((await loadGroups())[0].members[0].avatar).toBe(
      'data:image/jpeg;base64,NUEVA',
    )
  })

  it('trae las partidas que registraron otros celulares', async () => {
    stubServer(local, [match('a', '2026-10-02T10:00:00.000Z')])

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadMatches()
    expect(saved.id).toBe('a')
    expect(isPending(saved)).toBe(false)
  })

  it('no cambia nada si ya está todo al día', async () => {
    await saveMatch({
      ...match('a', '2026-10-02T10:00:00.000Z'),
      syncedAt: '2026-10-02T11:00:00.000Z',
    })
    stubServer(local, [match('a', '2026-10-02T10:00:00.000Z')])

    expect(await pullGroup('g1')).toBe(false)
  })

  it('actualiza nombres y fotos, y conserva quién soy yo', async () => {
    stubServer(
      {
        ...local,
        name: 'Los pibes del truco',
        members: [
          { id: 'm1', name: 'Juan', avatar: 'data:image/png;base64,AAA' },
          { id: 'm2', name: 'Pedrito' },
        ],
      },
      [],
    )

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadGroups()
    expect(saved.name).toBe('Los pibes del truco')
    expect(saved.members.map((member) => member.name)).toEqual([
      'Juan',
      'Pedrito',
    ])
    expect(saved.members[0].avatar).toBe('data:image/png;base64,AAA')
    expect(saved.myMemberId).toBe('m1')
    expect(saved.inviteCode).toBe(CODE)
  })

  it('actualiza el nombre en las partidas que ya estaban', async () => {
    await saveMatch({
      ...match('a', '2026-10-02T10:00:00.000Z'),
      syncedAt: '2026-10-02T11:00:00.000Z',
    })
    stubServer(local, [match('a', '2026-10-02T10:00:00.000Z', 'Pedrito')])

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadMatches()
    expect(saved.teams.ellos[0].name).toBe('Pedrito')
  })

  it('sin conexión deja todo como estaba', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )

    expect(await pullGroup('g1')).toBe(false)
    expect(await loadMatches()).toEqual([])
  })

  it('no hace nada con un grupo que todavía no está en el servidor', async () => {
    await saveGroup({ ...local, inviteCode: undefined })
    const fetchMock = stubServer(local, [])

    expect(await pullGroup('g1')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('syncGroup', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    await saveGroup(local)
  })

  it('envía las pendientes y luego trae las de los demás', async () => {
    await saveMatch(match('mia', '2026-10-02T10:00:00.000Z'))
    stubServer(local, [
      match('mia', '2026-10-02T10:00:00.000Z'),
      match('suya', '2026-10-03T10:00:00.000Z'),
    ])

    expect(await syncGroup('g1')).toBe(true)

    const saved = await loadMatches()
    expect(saved.map((item) => item.id).sort()).toEqual(['mia', 'suya'])
    expect(saved.some(isPending)).toBe(false)
  })
})

describe('pullGroup con partidas canceladas', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    await saveGroup(local)
  })

  const canceled = {
    at: '2026-10-06T10:00:00.000Z',
    by: 'm1',
    reason: 'Error al contar',
  }

  it('trae la cancelación que hizo otro celular', async () => {
    await saveMatch({
      ...match('a', '2026-10-02T10:00:00.000Z'),
      syncedAt: '2026-10-02T11:00:00.000Z',
    })
    stubServer(local, [{ ...match('a', '2026-10-02T10:00:00.000Z'), canceled }])

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadMatches()
    expect(saved.canceled).toEqual(canceled)
    expect(saved.syncedAt).toBe('2026-10-02T11:00:00.000Z')
  })

  it('trae la restauración: la partida deja de estar cancelada', async () => {
    await saveMatch({
      ...match('a', '2026-10-02T10:00:00.000Z'),
      syncedAt: '2026-10-02T11:00:00.000Z',
      canceled,
    })
    stubServer(local, [match('a', '2026-10-02T10:00:00.000Z')])

    expect(await pullGroup('g1')).toBe(true)

    const [saved] = await loadMatches()
    expect(saved.canceled).toBeUndefined()
  })

  it('guarda quién registró la partida', async () => {
    await saveMatch({
      ...match('a', '2026-10-02T10:00:00.000Z'),
      syncedAt: '2026-10-02T11:00:00.000Z',
    })
    stubServer(local, [
      { ...match('a', '2026-10-02T10:00:00.000Z'), createdBy: 'm2' },
    ])

    await pullGroup('g1')

    expect((await loadMatches())[0].createdBy).toBe('m2')
  })
})
