import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import {
  GAME_VERSION,
  QUICK_SLOT,
  clearGame,
  saveGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { HomeScreen } from './HomeScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { clearMembership } from './membership'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'

const emptyGame: PersistedGame = {
  version: GAME_VERSION,
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
        <Route path="/perfil" element={<div>perfil</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomeScreen', () => {
  beforeEach(async () => {
    await clearGame(QUICK_SLOT)
    clearMembership()
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
  })

  it('muestra Partida rápida cuando no hay ninguna en curso', async () => {
    renderHome()
    const link = await screen.findByRole('link', { name: 'Partida rápida' })
    expect(link).toHaveAttribute('href', '/partida')
    expect(
      screen.queryByRole('link', { name: /Continuar partida/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toContainElement(link)
  })

  it('no muestra las opciones del menú hasta abrirlo', async () => {
    renderHome()
    await screen.findByText('Aún no hay grupos')
    expect(
      screen.queryByRole('link', { name: 'Crear grupo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Ver perfil' }),
    ).not.toBeInTheDocument()
  })

  afterEach(() => {
    clearSession()
  })

  it('abre el menú y ofrece crear grupo y ver perfil con la sesión iniciada', async () => {
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderHome()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))

    const create = screen.getByRole('link', { name: 'Crear grupo' })
    const profile = screen.getByRole('link', { name: 'Ver perfil' })
    expect(create).toHaveAttribute('href', '/crear-grupo')
    expect(profile).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('banner')).toContainElement(create)
  })

  it('cierra el menú al elegir una opción', async () => {
    renderHome()
    fireEvent.click(await screen.findByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('link', { name: 'Ver perfil' }))

    expect(await screen.findByText('perfil')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Menú' }),
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

  it('lista los grupos en su propia card con integrantes y partidas jugadas', async () => {
    await saveGroup({
      id: 'g1',
      name: 'Los del truco',
      adminMemberIds: ['m1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [
        { id: 'm1', name: 'Juan' },
        { id: 'm2', name: 'Pedro' },
      ],
    })
    renderHome()

    const link = await screen.findByRole('link', { name: /Los del truco/ })
    expect(link).toHaveAttribute('href', '/grupo/g1')
    expect(link).toHaveTextContent('2 integrantes')
    expect(link).toHaveTextContent('0 partidas jugadas')
  })

  it('muestra la cantidad de partidas jugadas del grupo', async () => {
    await saveGroup({
      id: 'g1',
      name: 'Los del truco',
      adminMemberIds: ['m1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [{ id: 'm1', name: 'Juan' }],
    })
    const match: Match = {
      id: 'm1',
      type: 'group',
      groupId: 'g1',
      modality: '1v1',
      playedAt: '2026-01-01T00:00:00.000Z',
      durationSeconds: null,
      target: 20,
      winner: 'nos',
      teams: {
        nos: [{ id: 'm1', name: 'Juan' }],
        ellos: [{ id: 'm2', name: 'Pedro' }],
      },
      scores: { nos: 20, ellos: 15 },
    }
    await saveMatch(match)
    renderHome()

    expect(
      await screen.findByRole('link', { name: /1 partida jugada/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /0 partidas jugadas/ }),
    ).not.toBeInTheDocument()
  })

  it('informa que todavía no hay grupos', async () => {
    renderHome()
    expect(await screen.findByText('Aún no hay grupos')).toBeInTheDocument()
  })

  it('coloca el contenido en el bloque de contenido compartido', async () => {
    renderHome()
    const main = await screen.findByRole('main')
    expect(main).toContainElement(screen.getByText('Aún no hay grupos'))
  })
})
