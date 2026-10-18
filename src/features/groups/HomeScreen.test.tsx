import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  QUICK_SLOT,
  clearGame,
  saveGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { HomeScreen } from './HomeScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'

const emptyGame: PersistedGame = {
  version: 1,
  target: 30,
  firstReached: null,
  declined: false,
  history: { nos: [], ellos: [] },
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/partida" element={<div>contador</div>} />
        <Route path="/crear-grupo" element={<div>crear grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
  beforeEach(async () => {
    await clearGame(QUICK_SLOT)
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
  })

  it('muestra Partida rápida cuando no hay ninguna en curso', async () => {
    renderHome()
    expect(
      await screen.findByRole('link', { name: 'Partida rápida' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Continuar partida/ }),
    ).not.toBeInTheDocument()
  })

  it('muestra Continuar partida rápida con el puntaje cuando hay una en curso', async () => {
    await saveGame(QUICK_SLOT, {
      ...emptyGame,
      history: { nos: [12], ellos: [8] },
    })
    renderHome()

    expect(
      await screen.findByRole('link', {
        name: /Continuar partida rápida · 12 – 8/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Partida rápida' }),
    ).not.toBeInTheDocument()
  })

  it('no ofrece continuar si la partida guardada está vacía', async () => {
    await saveGame(QUICK_SLOT, emptyGame)
    renderHome()
    expect(
      await screen.findByRole('link', { name: 'Partida rápida' }),
    ).toBeInTheDocument()
  })

  it('lista los grupos del usuario', async () => {
    await saveGroup({
      id: 'g1',
      name: 'Los del truco',
      adminMemberId: 'm1',
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [{ id: 'm1', name: 'Juan' }],
    })
    renderHome()
    expect(
      await screen.findByRole('link', { name: 'Los del truco' }),
    ).toBeInTheDocument()
  })
})
