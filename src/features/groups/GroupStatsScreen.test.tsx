import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { GroupStatsScreen } from './GroupStatsScreen'
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

let sequence = 0

function buildMatch(overrides: Partial<Match> = {}): Match {
  sequence += 1
  return {
    id: `match-${sequence}`,
    type: 'group',
    groupId: 'g1',
    modality: '2v2',
    playedAt: `2026-03-${String(sequence).padStart(2, '0')}T20:00:00.000Z`,
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
    ...overrides,
  }
}

function renderStats() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}/estadisticas`]}>
      <Routes>
        <Route path="/grupo/:id/estadisticas" element={<GroupStatsScreen />} />
        <Route path="/grupo/:id" element={<div>grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GroupStatsScreen', () => {
  beforeEach(async () => {
    sequence = 0
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
  })

  it('muestra las estadísticas grupales por defecto', async () => {
    await saveMatch(buildMatch())
    renderStats()

    expect(await screen.findByText('Partidas')).toBeInTheDocument()
    expect(screen.getByText('Más larga')).toBeInTheDocument()
    expect(screen.getByText('Más corta')).toBeInTheDocument()
    expect(screen.getByText('Mayor diferencia')).toBeInTheDocument()
    expect(screen.getByText('Récords')).toBeInTheDocument()
  })

  it('muestra quiénes jugaron y la fecha en los récords de partidas', async () => {
    await saveMatch(buildMatch({ playedAt: '2026-03-05T20:00:00.000Z' }))
    renderStats()

    expect(await screen.findByText('Más larga')).toBeInTheDocument()
    expect(screen.getAllByText('Juan - Pedro').length).toBe(4)
    expect(screen.getAllByText('Luis - Ana').length).toBe(4)
    expect(screen.getAllByText('5/3/2026').length).toBe(4)
    expect(screen.getByText('Más pareja')).toBeInTheDocument()
    expect(screen.getAllByText('9 puntos').length).toBe(2)
  })

  it('muestra la mejor y la peor pareja en Equipos', async () => {
    await saveMatch(buildMatch())
    await saveMatch(buildMatch())
    await saveMatch(buildMatch())
    renderStats()

    expect(await screen.findByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Mejor pareja')).toBeInTheDocument()
    expect(screen.getByText('Peor pareja')).toBeInTheDocument()
    expect(screen.getAllByText('Juan - Pedro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Luis - Ana').length).toBeGreaterThan(0)
  })

  it('informa cuando el grupo no tiene partidas', async () => {
    renderStats()
    expect(
      await screen.findByText('Todavía no hay partidas jugadas'),
    ).toBeInTheDocument()
  })

  it('cambia a la pestaña de estadísticas individuales', async () => {
    await saveMatch(buildMatch())
    renderStats()

    fireEvent.click(await screen.findByRole('tab', { name: 'Individuales' }))
    expect(screen.getByRole('link', { name: /Juan/ })).toBeInTheDocument()
    expect(screen.getAllByText('Juan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0)
  })

  it('muestra los puntos de cada integrante en la pestaña individual', async () => {
    await saveMatch(buildMatch())
    renderStats()

    fireEvent.click(await screen.findByRole('tab', { name: 'Individuales' }))
    expect(screen.getAllByText(/^\d+ Pts$/)).toHaveLength(4)
  })

  it('cambia a la pestaña de enfrentamientos', async () => {
    await saveMatch(buildMatch())
    renderStats()

    fireEvent.click(await screen.findByRole('tab', { name: 'Enfrentamientos' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('1–0').length).toBeGreaterThan(0)
  })

  it('vuelve al grupo con el botón de la barra', async () => {
    renderStats()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('grupo')).toBeInTheDocument()
  })
})
