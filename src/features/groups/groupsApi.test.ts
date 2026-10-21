import { afterEach, describe, expect, it, vi } from 'vitest'
import { inviteLink, registerGroup } from './groupsApi'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro', avatar: 'data:image/jpeg;base64,AAAA' },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('registerGroup', () => {
  it('envía el grupo al servidor y devuelve el código de invitación', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ inviteCode: 'abc123' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const code = await registerGroup({ ...group, inviteCode: 'viejo' })

    expect(code).toBe('abc123')
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/grupos')
    // El servidor recibe el creador como `adminMemberId`.
    const { adminMemberIds, ...rest } = group
    expect(JSON.parse(init.body as string)).toEqual({
      ...rest,
      adminMemberId: adminMemberIds[0],
    })
  })
})

describe('inviteLink', () => {
  it('arma el enlace con el origen de la app y el código', () => {
    expect(inviteLink('abc123')).toBe(`${window.location.origin}/unirse/abc123`)
  })
})
