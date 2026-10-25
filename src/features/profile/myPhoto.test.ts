import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { hasPendingAvatar } from '../groups/avatarSync'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { applyMyPhoto } from './myPhoto'

const FOTO = 'data:image/jpeg;base64,AAA'

function group(id: string, code: string): Group {
  return {
    id,
    name: `Grupo ${id}`,
    adminMemberIds: [`${id}-a`],
    createdAt: '2026-01-01T00:00:00.000Z',
    inviteCode: code,
    myMemberId: `${id}-a`,
    members: [
      { id: `${id}-a`, name: 'Juan' },
      { id: `${id}-b`, name: 'Pedro' },
    ],
  }
}

let calls: { method: string; path: string }[]

beforeEach(async () => {
  for (const existing of await loadGroups()) {
    await deleteGroup(existing.id)
  }
  await saveGroup(group('g1', 'c1'))
  await saveGroup(group('g2', 'c2'))
  calls = []
  saveSession({
    token: 't'.repeat(64),
    user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

function serve(ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init: RequestInit = {}) => {
      calls.push({ method: init.method ?? 'GET', path })
      if (!ok) {
        throw new TypeError('sin conexión')
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }),
  )
}

describe('cambiar tu foto', () => {
  it('con cuenta, un solo pedido la cambia en todos tus grupos', async () => {
    serve(true)
    const result = await applyMyPhoto(await loadGroups(), FOTO)

    expect(result.problem).toBeNull()
    expect(calls).toEqual([{ method: 'PUT', path: '/api/yo/foto' }])
    for (const saved of await loadGroups()) {
      expect(
        saved.members.find((member) => member.id === saved.myMemberId)?.avatar,
      ).toBe(FOTO)
    }
  })

  it('sin conexión queda en el celular y pendiente de enviar en cada grupo', async () => {
    serve(false)
    const result = await applyMyPhoto(await loadGroups(), FOTO)

    expect(result.problem).not.toBeNull()
    expect(hasPendingAvatar('g1')).toBe(true)
    expect(hasPendingAvatar('g2')).toBe(true)
  })
})
