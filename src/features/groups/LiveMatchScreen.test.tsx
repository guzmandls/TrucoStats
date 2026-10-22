import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { LiveMatchScreen } from './LiveMatchScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import type { LiveMatch } from './liveApi'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  inviteCode: 'abc123',
  myMemberId: 'm2',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
  ],
}

function liveMatch(
  overrides: Partial<LiveMatch['state']> = {},
  extra: Partial<LiveMatch> = {},
): LiveMatch {
  return {
    id: 'v1',
    state: {
      teams: {
        nos: [{ id: 'm1', name: 'Juan' }],
        ellos: [{ id: 'm3', name: 'Luis' }],
      },
      target: 30,
      scores: { nos: 12, ellos: 8 },
      paused: false,
      elapsedSeconds: 95,
      winner: null,
      ...overrides,
    },
    startedAt: '2026-10-01T20:00:00.000Z',
    updatedAt: '2026-10-01T20:01:35.000Z',
    ageSeconds: 0,
    status: 'live',
    endedAt: null,
    reason: null,
    ...extra,
  }
}

function renderLive() {
  return render(
    <MemoryRouter initialEntries={['/grupo/g1/en-vivo/v1']}>
      <Routes>
        <Route
          path="/grupo/:id/en-vivo/:liveId"
          element={<LiveMatchScreen />}
        />
        <Route path="/grupo/:id" element={<div>pantalla del grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubLive(live: LiveMatch | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ live: live ? [live] : [] }), {
          status: 200,
        }),
    ),
  )
}

beforeEach(async () => {
  for (const existing of await loadGroups()) {
    await deleteGroup(existing.id)
  }
  await saveGroup(group)
  saveSession({
    token: 't'.repeat(64),
    user: { id: 'u2', username: 'pedro', email: null, name: 'Pedro' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('LiveMatchScreen', () => {
  it('muestra los equipos, los puntos y el tiempo de la partida en vivo', async () => {
    stubLive(liveMatch())
    renderLive()

    expect(await screen.findByTestId('live-score-nos')).toHaveTextContent('12')
    expect(screen.getByTestId('live-score-ellos')).toHaveTextContent('8')
    expect(screen.getByText('Juan')).toBeInTheDocument()
    expect(screen.getByText('Luis')).toBeInTheDocument()
    expect(screen.getByTestId('live-timer').textContent).toMatch(/^1:3\d$/)
    expect(screen.getByRole('status')).toHaveTextContent('Mirando en vivo')
  })

  it('avisa si está pausada y quién ganó', async () => {
    stubLive(liveMatch({ paused: true }))
    const first = renderLive()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Partida pausada',
    )
    first.unmount()

    stubLive(liveMatch({ winner: 'nos', scores: { nos: 30, ellos: 8 } }))
    renderLive()
    expect(await screen.findByText('Ganó Juan')).toBeInTheDocument()
  })

  it('cuando la partida terminó lo dice y vuelve al grupo', async () => {
    stubLive(null)
    renderLive()

    expect(await screen.findByText('La partida terminó.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Volver al grupo' }))
    expect(await screen.findByText('pantalla del grupo')).toBeInTheDocument()
  })

  it('si el contador se cerró hace más de un minuto, figura pausada y el tiempo se detiene', async () => {
    stubLive(liveMatch({}, { ageSeconds: 600 }))
    renderLive()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Partida pausada',
    )
    // 95 s jugados + el minuto de gracia, no los 10 minutos que pasaron.
    expect(screen.getByTestId('live-timer')).toHaveTextContent('2:35')
  })

  it('si el contador se cerró hace unos segundos sigue en vivo', async () => {
    stubLive(liveMatch({}, { ageSeconds: 20 }))
    renderLive()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Mirando en vivo',
    )
  })

  it('cuando la partida terminó muestra el cartel con quién ganó y el marcador', async () => {
    stubLive(
      liveMatch(
        { winner: 'nos', scores: { nos: 30, ellos: 21 } },
        { status: 'finished', endedAt: '2026-10-01T20:30:00.000Z' },
      ),
    )
    renderLive()

    expect(await screen.findByText('La partida terminó')).toBeInTheDocument()
    expect(screen.getByText('Ganó Juan, 30 a 21.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Terminó · Ganó Juan')
    fireEvent.click(screen.getByRole('button', { name: 'Ver en el historial' }))
    expect(await screen.findByText('pantalla del grupo')).toBeInTheDocument()
  })

  it('cuando la partida se canceló muestra el cartel con el motivo', async () => {
    stubLive(
      liveMatch(
        {},
        {
          status: 'canceled',
          endedAt: '2026-10-01T20:30:00.000Z',
          reason: 'Se cargó mal',
        },
      ),
    )
    renderLive()

    expect(
      await screen.findByText('La partida fue cancelada'),
    ).toBeInTheDocument()
    expect(screen.getByText('Motivo: Se cargó mal')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Partida cancelada')
    fireEvent.click(screen.getByRole('button', { name: 'Volver al grupo' }))
    expect(await screen.findByText('pantalla del grupo')).toBeInTheDocument()
  })

  it('el cartel de final se puede cerrar para seguir viendo el marcador', async () => {
    stubLive(
      liveMatch(
        {},
        { status: 'canceled', endedAt: '2026-10-01T20:30:00.000Z' },
      ),
    )
    renderLive()
    await screen.findByText('La partida fue cancelada')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByText('La partida fue cancelada')).toBeNull()
    expect(screen.getByTestId('live-score-nos')).toHaveTextContent('12')
  })
})
