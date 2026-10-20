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
import { QUICK_SLOT, clearGame, groupSlot } from '../counter/gameStorage'
import { saveGroup } from './groupsStorage'
import { StartGroupGameScreen } from './StartGroupGameScreen'
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
    { id: 'm5', name: 'Sofía' },
    { id: 'm6', name: 'Diego' },
    { id: 'm7', name: 'Marta' },
    { id: 'm8', name: 'Bruno' },
  ],
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

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[`/partida-grupo/${group.id}`]}>
      <Routes>
        <Route path="/partida-grupo/:id" element={<StartGroupGameScreen />} />
        <Route path="/partida" element={<NavStateProbe />} />
        <Route path="/grupo/:id" element={<div>pantalla del grupo</div>} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function row(memberName: string): HTMLElement {
  return screen
    .getByText(memberName)
    .closest('[data-testid="integrante"]') as HTMLElement
}

function addTo(memberName: string, side: 'Nosotros' | 'Ellos') {
  fireEvent.click(
    within(row(memberName)).getByRole('button', {
      name: `Agregar a ${side}`,
    }),
  )
}

function objectiveGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Objetivo' })
}

function objectiveValue(): string {
  return within(objectiveGroup()).getByText(/^\d+$/).textContent ?? ''
}

function raiseObjective(times = 1) {
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(
      within(objectiveGroup()).getByRole('button', { name: 'Subir objetivo' }),
    )
  }
}

async function renderLoaded() {
  renderScreen()
  await screen.findByText('Juan')
}

describe('StartGroupGameScreen', () => {
  beforeEach(async () => {
    await clearGame(QUICK_SLOT)
    await clearGame(groupSlot('g1'))
    await saveGroup(group)
  })

  it('muestra el objetivo por defecto de 2v2 antes de elegir equipos', async () => {
    await renderLoaded()
    expect(objectiveValue()).toBe('30')
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeDisabled()
  })

  it('usa 20 puntos para un 1v1', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Ellos')
    expect(objectiveValue()).toBe('20')
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeEnabled()
  })

  it('usa 40 puntos para un 3v3', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Nosotros')
    addTo('Luis', 'Nosotros')
    addTo('Ana', 'Ellos')
    addTo('Sofía', 'Ellos')
    addTo('Diego', 'Ellos')
    expect(objectiveValue()).toBe('40')
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeEnabled()
  })

  it('conserva el objetivo modificado por el usuario', async () => {
    await renderLoaded()
    raiseObjective()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Ellos')
    expect(objectiveValue()).toBe('35')
  })

  it('vuelve al grupo con el botón de la barra', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('pantalla del grupo')).toBeInTheDocument()
  })

  it('coloca el contenido en el bloque de contenido compartido', async () => {
    await renderLoaded()
    expect(screen.getByRole('main')).toContainElement(objectiveGroup())
  })

  it('bloquea Comenzar si los equipos tienen distinta cantidad', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Nosotros')
    addTo('Luis', 'Ellos')
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Los dos equipos deben tener la misma cantidad de integrantes.',
    )
  })

  it('bloquea Comenzar si un equipo tiene más de 3 integrantes', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Nosotros')
    addTo('Luis', 'Nosotros')
    addTo('Ana', 'Nosotros')
    addTo('Sofía', 'Ellos')
    addTo('Diego', 'Ellos')
    addTo('Marta', 'Ellos')
    addTo('Bruno', 'Ellos')
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cada equipo puede tener hasta 3 integrantes.',
    )
  })

  it('pide elegir integrantes en ambos equipos', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Elige al menos un integrante en cada equipo.',
    )
  })

  it('mueve a un integrante al otro equipo al tocar el lado contrario', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    expect(
      within(row('Juan')).getByRole('button', { name: 'Quitar de Nosotros' }),
    ).toBeInTheDocument()

    addTo('Juan', 'Ellos')
    expect(
      within(row('Juan')).getByRole('button', { name: 'Quitar de Ellos' }),
    ).toBeInTheDocument()
    expect(
      within(row('Juan')).getByRole('button', { name: 'Agregar a Nosotros' }),
    ).toBeInTheDocument()
  })

  it('navega al contador con los integrantes, la modalidad y el objetivo', async () => {
    await renderLoaded()
    addTo('Juan', 'Nosotros')
    addTo('Pedro', 'Ellos')
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar' }))

    await waitFor(() => expect(screen.getByTestId('nav-state')).toBeTruthy())
    const state = JSON.parse(screen.getByTestId('nav-state').textContent ?? '')
    expect(state.target).toBe(20)
    expect(state.gameContext).toEqual({
      type: 'group',
      groupId: 'g1',
      modality: '1v1',
      teams: {
        nos: [{ id: 'm1', name: 'Juan' }],
        ellos: [{ id: 'm2', name: 'Pedro' }],
      },
    })
  })
})
