import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GameContext } from '../counter/gameContext'
import {
  QUICK_SLOT,
  clearGame,
  groupSlot,
  saveGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { GroupScreen } from './GroupScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los del truco',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
    { id: 'm4', name: 'Ana' },
  ],
}

const groupContext: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  teams: {
    nos: [
      { id: 'm1', name: 'Juan' },
      { id: 'm2', name: 'Pedro' },
    ],
    ellos: [
      { id: 'm3', name: 'Luis' },
      { id: 'm4', name: 'Ana' },
    ],
  },
}

const emptyGame: PersistedGame = {
  version: 1,
  target: 30,
  firstReached: null,
  declined: false,
  history: { nos: [], ellos: [] },
}

interface NavState {
  gameContext: GameContext
  target: number
}

function NavStateProbe() {
  const location = useLocation()
  const state = location.state as NavState | null
  return <div data-testid="nav-state">{JSON.stringify(state)}</div>
}

function buildMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    type: 'group',
    groupId: 'g1',
    modality: '2v2',
    playedAt: '2026-03-05T20:00:00.000Z',
    durationSeconds: 1800,
    target: 30,
    winner: 'nos',
    teams: {
      nos: [
        { id: 'm1', name: 'Juan' },
        { id: 'm2', name: 'Pedro' },
      ],
      ellos: [
        { id: 'm3', name: 'Luis' },
        { id: 'm4', name: 'Ana' },
      ],
    },
    scores: { nos: 30, ellos: 21 },
    ...overrides,
  }
}

function renderGroup() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}`]}>
      <Routes>
        <Route path="/grupo/:id" element={<GroupScreen />} />
        <Route path="/partida" element={<NavStateProbe />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GroupScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    await clearGame(QUICK_SLOT)
    await clearGame(groupSlot('g1'))
    await clearGame(groupSlot('g2'))
    await saveGroup(group)
  })

  it('ofrece iniciar una partida cuando no hay ninguna en curso', async () => {
    renderGroup()
    expect(
      await screen.findByRole('link', { name: 'Iniciar partida' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Continuar partida/ }),
    ).not.toBeInTheDocument()
  })

  it('ofrece continuar la partida en curso con su puntaje', async () => {
    await saveGame(groupSlot('g1'), {
      ...emptyGame,
      history: { nos: [12], ellos: [8] },
      context: groupContext,
      target: 40,
    })
    renderGroup()

    const link = await screen.findByRole('link', {
      name: /Continuar partida · 12 – 8/,
    })
    expect(link).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Iniciar partida' }),
    ).not.toBeInTheDocument()
  })

  it('abre el contador con el contexto y el objetivo guardados', async () => {
    await saveGame(groupSlot('g1'), {
      ...emptyGame,
      history: { nos: [3], ellos: [] },
      context: groupContext,
      target: 40,
    })
    renderGroup()

    fireEvent.click(
      await screen.findByRole('link', { name: /Continuar partida/ }),
    )
    await waitFor(() => expect(screen.getByTestId('nav-state')).toBeTruthy())

    const state = JSON.parse(
      screen.getByTestId('nav-state').textContent ?? '',
    ) as NavState
    expect(state.target).toBe(40)
    expect(state.gameContext).toEqual(groupContext)
  })

  it('no muestra la partida en curso de otro grupo', async () => {
    await saveGame(groupSlot('g2'), {
      ...emptyGame,
      history: { nos: [10], ellos: [] },
      context: { ...groupContext, groupId: 'g2' },
    })
    renderGroup()

    expect(
      await screen.findByRole('link', { name: 'Iniciar partida' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Continuar partida/ }),
    ).not.toBeInTheDocument()
  })

  it('muestra el historial de partidas del grupo', async () => {
    await saveMatch(buildMatch({ id: 'm1' }))
    renderGroup()

    const history = await screen.findByTestId('historial')
    expect(
      within(history).getByText('Juan y Pedro 30 – 21 Luis y Ana'),
    ).toBeInTheDocument()
    expect(within(history).getByText(/2v2 · 30 puntos/)).toBeInTheDocument()
  })

  it('ordena las partidas de más recientes a más antiguas', async () => {
    await saveMatch(
      buildMatch({
        id: 'm1',
        playedAt: '2026-01-01T20:00:00.000Z',
        scores: { nos: 30, ellos: 15 },
      }),
    )
    await saveMatch(
      buildMatch({
        id: 'm2',
        playedAt: '2026-06-01T20:00:00.000Z',
        scores: { nos: 30, ellos: 21 },
      }),
    )
    renderGroup()

    const history = await screen.findByTestId('historial')
    const titles = within(history)
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild?.textContent)
    expect(titles).toEqual([
      'Juan y Pedro 30 – 21 Luis y Ana',
      'Juan y Pedro 30 – 15 Luis y Ana',
    ])
  })

  it('no muestra partidas de otros grupos ni partidas rápidas', async () => {
    await saveMatch(buildMatch({ id: 'm1' }))
    await saveMatch(buildMatch({ id: 'm2', groupId: 'g2' }))
    await saveMatch(
      buildMatch({ id: 'm3', type: 'quick', groupId: null, modality: null }),
    )
    renderGroup()

    const history = await screen.findByTestId('historial')
    expect(within(history).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText(/Partida rápida/)).not.toBeInTheDocument()
  })

  it('informa que todavía no hay partidas', async () => {
    renderGroup()
    expect(
      await screen.findByText('Todavía no hay partidas'),
    ).toBeInTheDocument()
  })
})
