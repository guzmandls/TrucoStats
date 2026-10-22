import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { ProfileScreen } from './ProfileScreen'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [{ id: 'm1', name: 'Juan' }],
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    type: 'quick',
    groupId: null,
    modality: null,
    playedAt: '2026-03-05T20:00:00.000Z',
    durationSeconds: 1800,
    target: 20,
    winner: 'nos',
    teams: { nos: [], ellos: [] },
    scores: { nos: 20, ellos: 12 },
    ...overrides,
  }
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/perfil']}>
      <Routes>
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function panel(title: string): HTMLElement {
  return screen.getByText(title).parentElement as HTMLElement
}

function valueIn(title: string, label: string): string | null {
  return (
    within(panel(title)).getByText(label).nextElementSibling?.textContent ??
    null
  )
}

describe('ProfileScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
  })

  it('informa que todavía no hay partidas', async () => {
    renderProfile()
    expect(
      await screen.findByText('Todavía no jugaste ninguna partida'),
    ).toBeInTheDocument()
  })

  it('resume las partidas rápidas y de grupo', async () => {
    await saveMatch(
      buildMatch({ id: 'm1', winner: 'nos', durationSeconds: 1800 }),
    )
    await saveMatch(
      buildMatch({
        id: 'm2',
        type: 'group',
        groupId: 'g1',
        modality: '1v1',
        winner: 'ellos',
        durationSeconds: null,
        teams: {
          nos: [{ id: 'm1', name: 'Juan' }],
          ellos: [{ id: 'm2', name: 'Pedro' }],
        },
      }),
    )
    // Una partida del grupo en la que Juan no jugó: no cuenta para su perfil.
    await saveMatch(
      buildMatch({
        id: 'm3',
        type: 'group',
        groupId: 'g1',
        modality: '1v1',
        winner: 'nos',
        teams: {
          nos: [{ id: 'm2', name: 'Pedro' }],
          ellos: [{ id: 'm3', name: 'Luis' }],
        },
      }),
    )
    await saveGroup({ ...group, myMemberId: 'm1' })

    renderProfile()
    await screen.findByRole('heading', { name: 'Resumen' })

    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('victorias')
    expect(main).toHaveTextContent('jugadas')

    expect(valueIn('Resumen', 'Derrotas')).toBe('1')
    expect(valueIn('Resumen', 'Duración promedio')).toBe('30 min')
    expect(valueIn('Resumen', 'Grupos')).toBe('1')

    expect(valueIn('Partidas rápidas', 'Jugadas')).toBe('1')
    expect(valueIn('Partidas rápidas', 'Porcentaje de victorias')).toBe('100%')
    expect(valueIn('Partidas de grupo', 'Jugadas')).toBe('1')
    expect(valueIn('Partidas de grupo', 'Porcentaje de victorias')).toBe('0%')
  })

  it('vuelve al inicio con el botón de la barra', async () => {
    renderProfile()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('inicio')).toBeInTheDocument()
  })
})

describe('foto del perfil', () => {
  beforeEach(async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
  })

  it('sin grupos donde se sepa quién eres no hay foto para editar', async () => {
    await saveGroup({
      ...group,
      inviteCode: undefined,
      myMemberId: undefined,
      adminMemberIds: [],
    })
    renderProfile()

    await screen.findByText('Todavía no jugaste ninguna partida')
    expect(screen.queryByRole('button', { name: 'Editar foto' })).toBeNull()
  })

  it('al tocar tu foto se edita y se quita en todos tus grupos', async () => {
    await saveGroup({
      ...group,
      myMemberId: 'm1',
      members: [
        { id: 'm1', name: 'Juan', avatar: 'data:image/jpeg;base64,AAA' },
      ],
    })
    await saveGroup({
      ...group,
      id: 'g2',
      name: 'Otros',
      myMemberId: 'm1',
      members: [
        { id: 'm1', name: 'Juan', avatar: 'data:image/jpeg;base64,AAA' },
      ],
    })
    renderProfile()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar foto' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar foto' }))

    await waitFor(async () => {
      const groups = await loadGroups()
      expect(groups.map((item) => item.members[0].avatar)).toEqual([
        undefined,
        undefined,
      ])
    })
  })
})
