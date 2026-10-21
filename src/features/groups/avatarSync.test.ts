import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasPendingAvatar, shareAvatar } from './avatarSync'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  inviteCode: 'abc123',
  myMemberId: 'm1',
  members: [{ id: 'm1', name: 'Juan' }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function stub(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )
}

describe('shareAvatar', () => {
  it('si llega, no hay nada pendiente ni mensaje', async () => {
    stub(200, { member: {} })

    expect(await shareAvatar(group, 'm1', 'data:x')).toBeNull()
    expect(hasPendingAvatar('g1')).toBe(false)
  })

  it('sin código de invitación (grupo solo en este celular) no hace nada', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await shareAvatar({ ...group, inviteCode: undefined }, 'm1', 'data:x'),
    ).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('un 403 avisa que la cuenta no está vinculada y queda pendiente', async () => {
    stub(403, {
      error: 'Solo el administrador o el propio integrante pueden cambiarlo',
    })

    expect(await shareAvatar(group, 'm1', 'data:x')).toMatch(
      /no está vinculada/,
    )
    expect(hasPendingAvatar('g1')).toBe(true)
  })

  it('un 401 pide iniciar sesión', async () => {
    stub(401, { error: 'No iniciaste sesión' })

    expect(await shareAvatar(group, 'm1', 'data:x')).toMatch(/Inicia sesión/)
  })

  it('sin conexión avisa que la foto quedó solo en este celular', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )

    expect(await shareAvatar(group, 'm1', 'data:x')).toMatch(/Sin conexión/)
    expect(hasPendingAvatar('g1')).toBe(true)
  })
})
