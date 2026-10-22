import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { loadMatches, deleteMatch } from '../matches/matchesStorage'
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
  liveId: 'live-1',
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
        <Route path="/grupo/:id" element={<div>pantalla del grupo</div>} />
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
  for (const existing of await loadMatches()) {
    await deleteMatch(existing.id)
  }
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
    expect(first.path).toBe('/api/grupos/abc123/en-vivo/live-1')
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

  it('al salir del contador sin haber jugado borra la partida en vivo', async () => {
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
        path: '/api/grupos/abc123/en-vivo/live-1',
        body: null,
      }),
    )
  })

  function press(label: string) {
    const button = screen.getByRole('button', { name: label })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
  }

  function lastPut() {
    return [...calls].reverse().find((call) => call.method === 'PUT')!
  }

  async function renderLoggedIn() {
    saveSession({
      token: 't'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup(group)
    return renderCounter(context)
  }

  it('al salir del contador con puntos la partida sigue en vivo, sin borrarse', async () => {
    const { unmount } = await renderLoggedIn()
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT')).toBe(true),
    )
    await act(async () => press('N'))
    await act(async () => press('N'))

    unmount()

    await waitFor(() =>
      expect(JSON.parse(lastPut().body!).state.scores.nos).toBe(2),
    )
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    expect(JSON.parse(lastPut().body!).status).toBeUndefined()
  })

  it('al terminar la partida avisa que terminó, con el marcador final', async () => {
    const { unmount } = await renderLoggedIn()
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT')).toBe(true),
    )
    await act(async () => {
      for (let i = 0; i < 30; i += 1) press('N')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Sí' }))

    await waitFor(() =>
      expect(JSON.parse(lastPut().body!)).toMatchObject({
        status: 'finished',
        state: { scores: { nos: 30, ellos: 0 }, winner: 'nos' },
      }),
    )
    unmount()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('cancelar la partida pide confirmación, avisa que se canceló y la deja en el historial', async () => {
    await renderLoggedIn()
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT')).toBe(true),
    )
    await act(async () => press('N'))
    await act(async () => press('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    expect(screen.getByText('¿Cancelar la partida?')).toBeInTheDocument()
    expect(
      screen.getByText('Quedará cancelada en el historial.'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'Se cargó mal' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    await waitFor(() =>
      expect(JSON.parse(lastPut().body!)).toMatchObject({
        status: 'canceled',
        reason: 'Se cargó mal',
        state: { scores: { nos: 1, ellos: 1 } },
      }),
    )
    expect(await screen.findByText('pantalla del grupo')).toBeInTheDocument()
    const saved = (await loadMatches()).filter((m) => m.groupId === 'g1')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      scores: { nos: 1, ellos: 1 },
      canceled: { by: 'm1', reason: 'Se cargó mal' },
    })
  })

  it('"Seguir jugando" cierra el cartel sin cancelar nada', async () => {
    await renderLoggedIn()
    await act(async () => press('N'))
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    fireEvent.click(screen.getByRole('button', { name: 'Seguir jugando' }))

    expect(screen.queryByText('¿Cancelar la partida?')).toBeNull()
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
    expect(await loadMatches()).toEqual([])
  })

  it('no ofrece cancelar una partida que todavía no empezó', async () => {
    await renderLoggedIn()
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))

    expect(
      screen.queryByRole('button', { name: 'Cancelar partida' }),
    ).toBeNull()
  })

  it('cancelar una partida rápida solo borra el marcador', async () => {
    renderCounter({
      type: 'quick',
      groupId: null,
      modality: null,
      teams: { nos: [], ellos: [] },
    })
    await act(async () => press('N'))
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    expect(screen.getByText('Se borrará el marcador.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Motivo (opcional)')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    expect(await screen.findByText('inicio')).toBeInTheDocument()
    expect(await loadMatches()).toEqual([])
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
