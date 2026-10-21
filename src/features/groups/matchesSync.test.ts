import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { getSyncProblem, isPending, syncPendingMatches } from './matchesSync'
import type { Group } from './types'

const CODE = 'abc123'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
  ],
  inviteCode: CODE,
}

function match(
  id: string,
  playedAt: string,
  extra: Partial<Match> = {},
): Match {
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
      ellos: [{ id: 'm2', name: 'Pedro' }],
    },
    scores: { nos: 30, ellos: 20 },
    ...extra,
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isPending', () => {
  it('solo las partidas de grupo sin confirmar están pendientes', () => {
    expect(isPending(match('a', '2026-10-02T10:00:00.000Z'))).toBe(true)
    expect(
      isPending(
        match('a', '2026-10-02T10:00:00.000Z', { syncedAt: '2026-10-02' }),
      ),
    ).toBe(false)
    expect(
      isPending(
        match('a', '2026-10-02T10:00:00.000Z', {
          type: 'quick',
          groupId: null,
          modality: null,
        }),
      ),
    ).toBe(false)
  })
})

describe('syncPendingMatches', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    await saveGroup(group)
  })

  it('envía las pendientes en orden y las marca como enviadas', async () => {
    await saveMatch(match('b', '2026-10-03T10:00:00.000Z'))
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    const fetchMock = vi.fn<typeof fetch>(async () => json({ match: {} }, 201))
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncPendingMatches()).toBe(2)

    const sentIds = fetchMock.mock.calls.map(
      ([, init]) =>
        (JSON.parse((init as RequestInit).body as string) as { id: string }).id,
    )
    expect(sentIds).toEqual(['a', 'b'])
    expect(fetchMock.mock.calls[0]).toEqual([
      `/api/grupos/${CODE}/partidas`,
      expect.objectContaining({ method: 'POST' }),
    ])
    expect((await loadMatches()).every((item) => !isPending(item))).toBe(true)
  })

  it('una partida cancelada sin conexión sube y se cancela en el servidor', async () => {
    await saveMatch(
      match('a', '2026-10-02T10:00:00.000Z', {
        canceled: {
          at: '2026-10-02T11:00:00.000Z',
          by: 'm1',
          reason: 'Mal cargada',
        },
      }),
    )
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith('/cancelar')
        ? json({
            match: {
              canceled: {
                at: '2026-10-02T12:00:00.000Z',
                by: 'm1',
                reason: 'Mal cargada',
              },
              createdBy: 'm1',
              registeredAt: '2026-10-02T12:00:00.000Z',
            },
          })
        : json({ match: {} }, 201),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncPendingMatches()).toBe(1)

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      `/api/grupos/${CODE}/partidas`,
      `/api/grupos/${CODE}/partidas/a/cancelar`,
    ])
    expect(
      JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string),
    ).toEqual({ reason: 'Mal cargada' })
    const [stored] = await loadMatches()
    expect(isPending(stored)).toBe(false)
    expect(stored.canceled?.at).toBe('2026-10-02T12:00:00.000Z')
  })

  it('si falla la conexión al cancelar, la partida sigue pendiente y se reintenta', async () => {
    await saveMatch(
      match('a', '2026-10-02T10:00:00.000Z', {
        canceled: { at: '2026-10-02T11:00:00.000Z', by: 'm1', reason: null },
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) => {
        if (String(input).endsWith('/cancelar')) {
          throw new TypeError('sin red')
        }
        return json({ match: {} }, 201)
      }),
    )

    expect(await syncPendingMatches()).toBe(0)

    const [stored] = await loadMatches()
    expect(isPending(stored)).toBe(true)
    expect(stored.canceled).toBeDefined()
  })

  it('si el servidor no permite la cancelación, queda como diga el servidor', async () => {
    await saveMatch(
      match('a', '2026-10-02T10:00:00.000Z', {
        canceled: { at: '2026-10-02T11:00:00.000Z', by: 'm1', reason: null },
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) =>
        String(input).endsWith('/cancelar')
          ? json({ error: 'No puedes cancelarla' }, 403)
          : json({ match: {} }, 201),
      ),
    )

    expect(await syncPendingMatches()).toBe(1)

    const [stored] = await loadMatches()
    expect(isPending(stored)).toBe(false)
    expect(stored.canceled).toBeUndefined()
  })

  it('si el servidor rechaza por falta de vínculo (403), deja dicho por qué', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () =>
        json({ error: 'No eres integrante de este grupo' }, 403),
      ),
    )

    await syncPendingMatches()

    expect(getSyncProblem()).toMatch(/no está vinculada/)
    expect((await loadMatches()).filter(isPending)).toHaveLength(1)
  })

  it('sin conexión también deja dicho el problema, y se borra cuando todo sale bien', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )
    await syncPendingMatches()
    expect(getSyncProblem()).toMatch(/Sin conexión/)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ match: {} }, 201)),
    )
    await syncPendingMatches()
    expect(getSyncProblem()).toBeNull()
  })

  it('no reenvía las que ya llegaron', async () => {
    await saveMatch(
      match('a', '2026-10-02T10:00:00.000Z', { syncedAt: '2026-10-02' }),
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncPendingMatches()).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin conexión las deja pendientes y no falla', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    await saveMatch(match('b', '2026-10-03T10:00:00.000Z'))
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('sin red')))
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncPendingMatches()).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((await loadMatches()).filter(isPending)).toHaveLength(2)
  })

  it('reintenta al volver la conexión', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )
    await syncPendingMatches()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ match: {} }, 201)),
    )
    expect(await syncPendingMatches()).toBe(1)
  })

  it('si el servidor rechaza una partida, sigue con las demás', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    await saveMatch(match('b', '2026-10-03T10:00:00.000Z'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) =>
        (JSON.parse(init.body as string) as { id: string }).id === 'a'
          ? json({ error: 'Partida inválida' }, 400)
          : json({ match: {} }, 201),
      ),
    )

    expect(await syncPendingMatches()).toBe(1)
    const pending = (await loadMatches()).filter(isPending)
    expect(pending.map((item) => item.id)).toEqual(['a'])
  })

  it('registra primero el grupo si todavía no está en el servidor', async () => {
    await saveGroup({ ...group, inviteCode: undefined })
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    const fetchMock = vi.fn(async (url: string) =>
      url === '/api/grupos'
        ? json({ inviteCode: CODE }, 201)
        : json({ match: {} }, 201),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncPendingMatches()).toBe(1)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/grupos',
      `/api/grupos/${CODE}/partidas`,
    ])
    const [saved] = await loadGroups()
    expect(saved.inviteCode).toBe(CODE)
  })

  it('una partida guardada durante el envío también se envía', async () => {
    await saveMatch(match('a', '2026-10-02T10:00:00.000Z'))
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let first = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (first) {
          first = false
          await gate
        }
        return json({ match: {} }, 201)
      }),
    )

    const running = syncPendingMatches()
    await saveMatch(match('b', '2026-10-03T10:00:00.000Z'))
    const again = syncPendingMatches()
    release()

    expect(await running).toBe(2)
    expect(await again).toBe(2)
    expect((await loadMatches()).filter(isPending)).toEqual([])
  })
})
