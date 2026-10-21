import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameContext } from '../counter/gameContext'
import {
  GAME_VERSION,
  QUICK_SLOT,
  clearGame,
  groupSlot,
  saveGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { clearSession, saveSession } from '../../lib/session'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { GroupScreen } from './GroupScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { clearMembership, loadMembership } from './membership'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los del truco',
  adminMemberIds: ['m1'],
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
  version: GAME_VERSION,
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

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

async function openInvite() {
  fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Invitar' }))
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
    clearMembership()
    await saveGroup(group)
  })

  it('avisa cuántas partidas están sin enviar y las marca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )
    await saveMatch(buildMatch({ id: 'p1' }))
    await saveMatch(
      buildMatch({ id: 'p2', syncedAt: '2026-03-05T21:00:00.000Z' }),
    )
    await saveMatch(buildMatch({ id: 'p3' }))
    renderGroup()

    expect(
      await screen.findByRole('status', { name: '2 partidas sin enviar' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Sin enviar/)).toHaveLength(2)
  })

  it('quita el aviso cuando las partidas llegan al servidor', async () => {
    await saveGroup({ ...group, inviteCode: 'abc123' })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ match: {} }), { status: 201 }),
      ),
    )
    await saveMatch(buildMatch({ id: 'p1' }))
    renderGroup()

    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    )
    expect(screen.queryByText(/Sin enviar/)).not.toBeInTheDocument()
  })

  it('busca partidas desde el menú', async () => {
    await saveMatch(buildMatch({ id: 'p1' }))
    await saveMatch(
      buildMatch({
        id: 'p2',
        scores: { nos: 12, ellos: 30 },
        winner: 'ellos',
        teams: {
          nos: [{ id: 'm1', name: 'Juan' }],
          ellos: [{ id: 'm3', name: 'Luis' }],
        },
        modality: '1v1',
      }),
    )
    renderGroup()
    await screen.findAllByTestId('partida')
    expect(screen.queryByLabelText('Buscar en el historial')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Búsqueda' }))
    fireEvent.change(screen.getByLabelText('Buscar en el historial'), {
      target: { value: '12' },
    })
    expect(screen.getAllByTestId('partida')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Buscar en el historial'), {
      target: { value: 'zzz' },
    })
    expect(
      screen.getByText('Ninguna partida coincide con la búsqueda'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }))
    expect(screen.getAllByTestId('partida')).toHaveLength(2)
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

  it('muestra cada equipo en su línea y los dos puntajes en un solo bloque', async () => {
    await saveMatch(buildMatch({ id: 'm1' }))
    renderGroup()

    const row = await screen.findByTestId('partida')
    const lines = within(row)
      .getAllByText(/Juan - Pedro|Luis - Ana/)
      .map((element) => element.textContent)
    expect(lines).toEqual(['Juan - Pedro', 'Luis - Ana'])
    const scores = within(row).getByText('30').parentElement
    expect(scores).toContainElement(within(row).getByText('21'))
    expect(scores?.textContent).toBe('3021')
    // Debajo de la tarjeta van la hora y la duración; la modalidad y el objetivo
    // no se repiten porque se ven en la tarjeta.
    expect(within(row).getByText('30 min')).toBeInTheDocument()
    expect(within(row).queryByText('2v2')).not.toBeInTheDocument()
    expect(within(row).queryByText('30 pts')).not.toBeInTheDocument()
  })

  it('resalta al equipo ganador', async () => {
    await saveMatch(buildMatch({ id: 'm1' }))
    renderGroup()

    const row = await screen.findByTestId('partida')
    const winner = within(row).getByText('Juan - Pedro').parentElement
    const loser = within(row).getByText('Luis - Ana').parentElement
    expect(winner?.className).not.toBe(loser?.className)
  })

  it('agrupa las partidas por día con su título', async () => {
    const day = (offset: number) => {
      const date = new Date()
      date.setDate(date.getDate() - offset)
      date.setHours(12, 0, 0, 0)
      return date.toISOString()
    }
    await saveMatch(buildMatch({ id: 'm1', playedAt: day(0) }))
    await saveMatch(buildMatch({ id: 'm2', playedAt: day(0) }))
    await saveMatch(buildMatch({ id: 'm3', playedAt: day(1) }))
    renderGroup()

    const history = await screen.findByTestId('historial')
    const headings = within(history)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Hoy', 'Ayer'])
    expect(within(history).getAllByTestId('partida')).toHaveLength(3)
  })

  it('muestra los puntos que sumaste o restaste si jugaste, y nada si no', async () => {
    await saveGroup({ ...group, myMemberId: 'm1' })
    await saveMatch(buildMatch({ id: 'm1' }))
    await saveMatch(
      buildMatch({
        id: 'm2',
        playedAt: '2026-03-06T20:00:00.000Z',
        teams: {
          nos: [{ id: 'm3', name: 'Luis' }],
          ellos: [{ id: 'm4', name: 'Ana' }],
        },
      }),
    )
    renderGroup()

    const rows = await screen.findAllByTestId('partida')
    expect(within(rows[1]).getByText(/^[+][0-9]+ Pts$/)).toBeInTheDocument()
    expect(within(rows[0]).queryByText(/Pts$/)).not.toBeInTheDocument()
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
      .getAllByTestId('partida')
      .map((row) => row.textContent ?? '')
    expect(titles[0]).toContain('21')
    expect(titles[1]).toContain('15')
  })

  it('no muestra partidas de otros grupos ni partidas rápidas', async () => {
    await saveMatch(buildMatch({ id: 'm1' }))
    await saveMatch(buildMatch({ id: 'm2', groupId: 'g2' }))
    await saveMatch(
      buildMatch({ id: 'm3', type: 'quick', groupId: null, modality: null }),
    )
    renderGroup()

    const history = await screen.findByTestId('historial')
    expect(within(history).getAllByTestId('partida')).toHaveLength(1)
    expect(screen.queryByText(/Partida rápida/)).not.toBeInTheDocument()
  })

  it('informa que todavía no hay partidas', async () => {
    renderGroup()
    expect(
      await screen.findByText('Todavía no hay partidas'),
    ).toBeInTheDocument()
  })

  it('vuelve al inicio con el botón de la barra', async () => {
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('inicio')).toBeInTheDocument()
  })

  it('muestra el nombre del grupo en la barra', async () => {
    renderGroup()
    expect(
      await screen.findByRole('heading', { level: 1, name: group.name }),
    ).toBeInTheDocument()
  })

  it('enlaza a las estadísticas y a los participantes del grupo', async () => {
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    expect(
      await screen.findByRole('link', { name: 'Estadísticas' }),
    ).toHaveAttribute('href', `/grupo/${group.id}/estadisticas`)
    expect(screen.getByRole('link', { name: 'Participantes' })).toHaveAttribute(
      'href',
      `/grupo/${group.id}/participantes`,
    )
  })

  it('ofrece agregar un integrante solo a los administradores', async () => {
    await saveGroup({
      ...group,
      inviteCode: 'abc123',
      myMemberId: 'm1',
    })
    const { unmount } = renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Agregar integrante' }),
    )
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Agregar integrante',
    )
    unmount()

    await saveGroup({ ...group, inviteCode: 'abc123', myMemberId: 'm2' })
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    await screen.findByRole('link', { name: 'Participantes' })
    expect(
      screen.queryByRole('button', { name: 'Agregar integrante' }),
    ).toBeNull()
  })

  it('muestra el enlace de invitación si el grupo ya está en el servidor', async () => {
    await saveGroup({ ...group, inviteCode: 'abc123' })
    renderGroup()

    await openInvite()

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Invitar al grupo',
    )
    expect(screen.getByLabelText('Enlace de invitación')).toHaveValue(
      `${window.location.origin}/unirse/abc123`,
    )
  })

  it('registra el grupo en el servidor al invitar si todavía no estaba', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ inviteCode: 'nuevo99' }), {
          status: 201,
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderGroup()

    await openInvite()

    expect(await screen.findByLabelText('Enlace de invitación')).toHaveValue(
      `${window.location.origin}/unirse/nuevo99`,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((await loadGroups())[0].inviteCode).toBe('nuevo99')
  })

  it('avisa que hace falta conexión si no se puede registrar el grupo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('sin red'))),
    )
    renderGroup()

    await openInvite()

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Necesitas conexión a Internet',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await loadGroups())[0].inviteCode).toBeUndefined()
  })

  it('pide confirmación antes de salir del grupo', async () => {
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      `¿Quieres salir del grupo “Los del truco”?`,
    )
  })

  it('transfiere la administración al salir si quedan integrantes', async () => {
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('inicio')).toBeInTheDocument()
    const [saved] = await loadGroups()
    expect(saved.adminMemberIds).toEqual(['m2'])
  })

  it('avisa al servidor al salir de un grupo que está en el servidor', async () => {
    saveSession({
      token: 't',
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup({ ...group, inviteCode: 'abc123' })
    const fetchMock = vi.fn(
      async (path: string) =>
        new Response(JSON.stringify({ deleted: false, path }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderGroup()

    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('inicio')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([path]) => path === '/api/grupos/abc123/salir',
      ),
    ).toBe(true)
  })

  it('no sale del grupo si no hay conexión para avisar al servidor', async () => {
    saveSession({
      token: 't',
      user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
    })
    await saveGroup({ ...group, inviteCode: 'abc123' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    renderGroup()

    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(
      await screen.findByText(
        'Necesitas conexión a Internet para salir del grupo.',
      ),
    ).toBeInTheDocument()
    expect((await loadGroups()).length).toBe(1)
  })

  it('advierte y borra el grupo al salir si es el único integrante', async () => {
    await deleteGroup('g1')
    await saveGroup({
      ...group,
      members: [{ id: 'm1', name: 'Juan' }],
      adminMemberIds: ['m1'],
    })
    renderGroup()

    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      /Se borrarán las estadísticas del grupo/,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))
    expect(await screen.findByText('inicio')).toBeInTheDocument()
    expect(await loadGroups()).toEqual([])
  })

  it('quita el grupo de la pertenencia al salir', async () => {
    renderGroup()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Salir del grupo' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    await screen.findByText('inicio')
    expect(loadMembership()).not.toContain('g1')
  })
})
