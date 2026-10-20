import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { MemberScreen } from './MemberScreen'
import { ParticipantsScreen } from './ParticipantsScreen'
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

const match: Match = {
  id: 'match-1',
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  playedAt: '2026-03-01T20:00:00.000Z',
  durationSeconds: 900,
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
}

function renderParticipants() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}/participantes`]}>
      <Routes>
        <Route
          path="/grupo/:id/participantes"
          element={<ParticipantsScreen />}
        />
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<div>ficha</div>}
        />
        <Route path="/grupo/:id" element={<div>grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderMember() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}/participantes/m1`]}>
      <Routes>
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<MemberScreen />}
        />
        <Route path="/grupo/:id/participantes" element={<div>lista</div>} />
        <Route path="/grupo/:id" element={<div>grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ParticipantsScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
  })

  it('lista a los integrantes como enlaces', async () => {
    renderParticipants()
    const juan = await screen.findByRole('link', { name: /Juan/ })
    expect(juan).toHaveAttribute('href', `/grupo/${group.id}/participantes/m1`)
    expect(screen.getByRole('link', { name: /Ana/ })).toBeInTheDocument()
  })

  it('abre la ficha al tocar un integrante', async () => {
    renderParticipants()
    fireEvent.click(await screen.findByRole('link', { name: /Juan/ }))
    expect(await screen.findByText('ficha')).toBeInTheDocument()
  })

  it('vuelve al grupo con el botón de la barra', async () => {
    renderParticipants()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('grupo')).toBeInTheDocument()
  })
})

describe('MemberScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
  })

  it('muestra las estadísticas personales del integrante', async () => {
    await saveMatch(match)
    renderMember()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Participante' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Detalle')).toBeInTheDocument()
    expect(screen.getByText('Al que más le gana')).toBeInTheDocument()
  })

  it('permite elegir una foto aunque todavía no haya jugado', async () => {
    renderMember()
    expect(
      await screen.findByRole('button', { name: 'Elige foto' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Detalle')).toBeInTheDocument()
  })
})
