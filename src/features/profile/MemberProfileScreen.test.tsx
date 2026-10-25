import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { MemberProfileScreen } from './MemberProfileScreen'

const group: Group = {
  id: 'g1',
  name: 'Los del truco',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  inviteCode: 'abc123',
  myMemberId: 'm1',
  members: [
    { id: 'm1', name: 'Juan', aliases: ['Juancho'] },
    { id: 'm2', name: 'Pedro' },
  ],
}

const match: Match = {
  id: 'p1',
  type: 'group',
  groupId: 'g1',
  modality: '1v1',
  playedAt: '2026-03-01T20:00:00.000Z',
  durationSeconds: 900,
  target: 30,
  winner: 'nos',
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
  scores: { nos: 30, ellos: 21 },
  syncedAt: '2026-03-01T20:10:00.000Z',
}

const pedroPersonal = {
  total: 12,
  wins: 7,
  losses: 5,
  winRate: 58,
  averageDurationSeconds: 600,
  groups: 3,
  quick: { total: 4, wins: 3, losses: 1, winRate: 75 },
  group: { total: 8, wins: 4, losses: 4, winRate: 50 },
}

function renderProfile(memberId: string) {
  return render(
    <MemoryRouter initialEntries={[`/grupo/g1/participantes/${memberId}`]}>
      <Routes>
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<MemberProfileScreen />}
        />
        <Route path="/perfil/editar" element={<div>editar perfil</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function serve(handler: (path: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => handler(path)),
  )
}

beforeEach(async () => {
  for (const existing of await loadGroups()) {
    await deleteGroup(existing.id)
  }
  for (const existing of await loadMatches()) {
    await deleteMatch(existing.id)
  }
  await saveGroup(group)
  await saveMatch(match)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('perfil desde un grupo', () => {
  it('el propio: estadísticas personales y en el grupo, editable y sin apodos', async () => {
    renderProfile('m1')

    expect(
      await screen.findByText('Estadísticas personales'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Estadísticas en “Los del truco”'),
    ).toBeInTheDocument()
    expect(screen.getByText('Al que más le gana')).toBeInTheDocument()
    expect(screen.queryByText('Juancho')).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar perfil' })[0])
    expect(screen.getByText('editar perfil')).toBeInTheDocument()
  })

  it('el de otro: sus estadísticas personales del servidor, sin poder editar', async () => {
    serve(
      () =>
        new Response(JSON.stringify({ personal: pedroPersonal }), {
          status: 200,
        }),
    )
    renderProfile('m2')

    expect(
      await screen.findByText('Estadísticas personales'),
    ).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(
      screen.getByText('Estadísticas en “Los del truco”'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull()
  })

  it('sin conexión lo dice y muestra igual las del grupo', async () => {
    serve(() => {
      throw new TypeError('sin conexión')
    })
    renderProfile('m2')

    expect(
      await screen.findByText(
        'Necesitas conexión para ver sus estadísticas personales.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Estadísticas en “Los del truco”'),
    ).toBeInTheDocument()
  })

  it('un lugar que nadie eligió solo tiene las del grupo', async () => {
    serve(
      () => new Response(JSON.stringify({ personal: null }), { status: 200 }),
    )
    renderProfile('m2')

    expect(
      await screen.findByText('Estadísticas en “Los del truco”'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Estadísticas personales')).toBeNull()
  })
})
