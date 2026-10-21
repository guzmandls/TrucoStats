import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { clearGame, groupSlot } from './gameStorage'
import type { GameContext } from './gameContext'
import { CounterScreen } from './CounterScreen'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  inviteCode: 'abc123',
  myMemberId: 'm1',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
  ],
}

const context: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '1v1',
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
}

function renderCounter(ctx: GameContext) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/partida', state: { gameContext: ctx, target: 30 } },
      ]}
    >
      <Routes>
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

interface Call {
  method: string
  path: string
  body: string | null
}

let calls: Call[]

beforeEach(async () => {
  calls = []
  for (const existing of await loadGroups()) {
    await deleteGroup(existing.id)
  }
  await clearGame(groupSlot('g1'))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init: RequestInit = {}) => {
      calls.push({
        method: init.method ?? 'GET',
        path,
        body: (init.body as string) ?? null,
      })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('transmisión en vivo del contador', () => {
  it('publica la partida de grupo y la actualiza al sumar puntos', async () => {
    saveSession({
      token: 't'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup(group)
    renderCounter(context)

    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT')).toBe(true),
    )
    const first = calls.find((call) => call.method === 'PUT')!
    expect(first.path).toBe('/api/grupos/abc123/en-vivo')
    expect(JSON.parse(first.body!).state).toMatchObject({
      scores: { nos: 0, ellos: 0 },
      target: 30,
      teams: context.teams,
    })

    const before = calls.filter((call) => call.method === 'PUT').length
    const plus = screen.getByRole('button', { name: 'N' })
    await act(async () => {
      fireEvent.pointerDown(plus)
      fireEvent.pointerUp(plus)
    })
    await waitFor(() =>
      expect(
        calls.filter((call) => call.method === 'PUT').length,
      ).toBeGreaterThan(before),
    )
    const last = [...calls].reverse().find((call) => call.method === 'PUT')!
    expect(JSON.parse(last.body!).state.scores.nos).toBe(1)
  })

  it('al salir del contador borra la partida en vivo', async () => {
    saveSession({
      token: 't'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup(group)
    const { unmount } = renderCounter(context)
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT')).toBe(true),
    )

    unmount()

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/api/grupos/abc123/en-vivo',
        body: null,
      }),
    )
  })

  it('no transmite la partida rápida ni sin sesión', async () => {
    saveSession({
      token: 't'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup(group)
    const quick = renderCounter({
      type: 'quick',
      groupId: null,
      modality: null,
      teams: { nos: [], ellos: [] },
    })
    quick.unmount()
    clearSession()
    renderCounter(context)
    await new Promise((resolve) => setTimeout(resolve, 700))

    expect(calls.filter((call) => call.path.includes('/en-vivo'))).toEqual([])
  })
})
