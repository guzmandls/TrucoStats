import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { GroupScreen } from './GroupScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { clearMembership } from './membership'
import type { Group } from './types'

const CODE = 'abc123'

const group: Group = {
  id: 'g1',
  name: 'Los del truco',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
  ],
  inviteCode: CODE,
  myMemberId: 'm1',
}

function buildMatch(id: string, overrides: Partial<Match> = {}): Match {
  return {
    id,
    type: 'group',
    groupId: 'g1',
    modality: '1v1',
    playedAt: '2026-03-05T20:00:00.000Z',
    durationSeconds: 600,
    target: 30,
    winner: 'nos',
    teams: {
      nos: [{ id: 'm2', name: 'Pedro' }],
      ellos: [{ id: 'm3', name: 'Luis' }],
    },
    scores: { nos: 30, ellos: 12 },
    syncedAt: '2026-03-05T21:00:00.000Z',
    createdBy: 'm2',
    ...overrides,
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

// Servidor falso: el grupo y las partidas vuelven vacíos (no pisan lo local) y
// las acciones responden lo que se le indique.
function stubServer(action: (url: string, body: unknown) => Response) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return action(url, JSON.parse(String(init.body ?? '{}')))
    }
    return url.endsWith('/partidas')
      ? json({ matches: [] })
      : json({ group, inviteCode: CODE })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderGroup() {
  return render(
    <MemoryRouter initialEntries={['/grupo/g1']}>
      <Routes>
        <Route path="/grupo/:id" element={<GroupScreen />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cancelar y restaurar partidas', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    clearMembership()
    await saveGroup(group)
  })

  it('el administrador ve las opciones en todas las partidas', async () => {
    await saveMatch(buildMatch('p1'))
    stubServer(() => json({}))
    renderGroup()

    expect(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    ).toBeInTheDocument()
  })

  it('quien no es administrador ni la registró no ve las opciones', async () => {
    await saveGroup({ ...group, myMemberId: 'm3' })
    await saveMatch(buildMatch('p1'))
    stubServer(() => json({}))
    renderGroup()

    await screen.findByTestId('partida')
    expect(
      screen.queryByRole('button', { name: 'Opciones de la partida' }),
    ).not.toBeInTheDocument()
  })

  it('quien registró la partida puede cancelarla aunque no sea administrador', async () => {
    await saveGroup({ ...group, myMemberId: 'm2' })
    await saveMatch(buildMatch('p1'))
    stubServer(() => json({}))
    renderGroup()

    expect(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    ).toBeInTheDocument()
  })

  it('cancela con un motivo opcional y la partida queda marcada', async () => {
    await saveMatch(buildMatch('p1'))
    const fetchMock = stubServer((url, body) => {
      expect(url).toBe(`/api/grupos/${CODE}/partidas/p1/cancelar`)
      expect(body).toEqual({ reason: 'Error al contar' })
      return json({
        match: {
          ...buildMatch('p1'),
          canceled: {
            at: '2026-03-06T10:00:00.000Z',
            by: 'm1',
            reason: 'Error al contar',
          },
        },
      })
    })
    renderGroup()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar partida' }))
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'Error al contar' },
    })
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar partida',
      }),
    )

    expect(await screen.findByText(/Cancelada/)).toBeInTheDocument()
    expect(screen.getByText('Motivo: Error al contar')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalled()
    const [stored] = await loadMatches()
    expect(stored.canceled?.reason).toBe('Error al contar')
    // Sigue en el historial y se puede restaurar.
    expect(screen.getAllByTestId('partida')).toHaveLength(1)
    fireEvent.click(
      screen.getByRole('button', { name: 'Opciones de la partida' }),
    )
    expect(
      screen.getByRole('menuitem', { name: 'Restaurar partida' }),
    ).toBeInTheDocument()
  })

  it('una partida cancelada no cuenta para los puntos', async () => {
    await saveMatch(
      buildMatch('p1', {
        teams: {
          nos: [{ id: 'm1', name: 'Juan' }],
          ellos: [{ id: 'm3', name: 'Luis' }],
        },
        winner: 'nos',
        canceled: { at: '2026-03-06T10:00:00.000Z', by: 'm1', reason: null },
      }),
    )
    stubServer(() => json({}))
    renderGroup()

    await screen.findByTestId('partida')
    expect(screen.getByText('0 Pts')).toBeInTheDocument()
  })

  it('restaura una partida cancelada', async () => {
    await saveMatch(
      buildMatch('p1', {
        canceled: { at: '2026-03-06T10:00:00.000Z', by: 'm1', reason: 'x' },
      }),
    )
    stubServer((url) => {
      expect(url).toBe(`/api/grupos/${CODE}/partidas/p1/restaurar`)
      return json({ match: buildMatch('p1') })
    })
    renderGroup()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Restaurar partida' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Restaurar partida',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByText(/Cancelada/)).not.toBeInTheDocument(),
    )
    const [stored] = await loadMatches()
    expect(stored.canceled).toBeUndefined()
  })

  it('sin conexión avisa y no cambia la partida', async () => {
    await saveMatch(buildMatch('p1'))
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('sin red'))),
    )
    renderGroup()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar partida' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar partida',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Necesitas conexión a Internet',
    )
    expect((await loadMatches())[0].canceled).toBeUndefined()
  })

  it('muestra el aviso del servidor si no tiene permiso', async () => {
    await saveMatch(buildMatch('p1'))
    stubServer(() =>
      json({ error: 'Solo el administrador puede cancelarla' }, 403),
    )
    renderGroup()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar partida' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar partida',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo el administrador puede cancelarla',
    )
  })

  it('la X cierra el cuadro sin cancelar', async () => {
    await saveMatch(buildMatch('p1'))
    stubServer(() => json({}))
    renderGroup()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await loadMatches())[0].canceled).toBeUndefined()
  })

  it('las canceladas se encuentran buscando "cancelada"', async () => {
    await saveMatch(buildMatch('p1'))
    await saveMatch(
      buildMatch('p2', {
        scores: { nos: 30, ellos: 5 },
        canceled: { at: '2026-03-06T10:00:00.000Z', by: 'm1', reason: null },
      }),
    )
    stubServer(() => json({}))
    renderGroup()

    await screen.findAllByTestId('partida')
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Búsqueda' }))
    fireEvent.change(screen.getByLabelText('Buscar en el historial'), {
      target: { value: 'cancelada' },
    })

    expect(screen.getAllByTestId('partida')).toHaveLength(1)
  })
})
