import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GameContext } from './gameContext'
import { CounterScreen } from './CounterScreen'
import {
  QUICK_SLOT,
  clearGame,
  groupSlot,
  hasMoves,
  loadGame,
} from './gameStorage'
import { deleteMatch, loadMatches } from '../matches/matchesStorage'

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

function renderCounter(context?: GameContext) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/partida',
          state: context ? { gameContext: context } : null,
        },
      ]}
    >
      <CounterScreen />
    </MemoryRouter>,
  )
}

function pressButton(label: string) {
  const button = screen.getByRole('button', { name: label })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
}

async function playUntilVictory(points: number) {
  for (let i = 0; i < points; i += 1) {
    pressButton('N')
  }
}

describe('flujo completo de partida', () => {
  beforeEach(async () => {
    await clearGame(QUICK_SLOT)
    await clearGame(groupSlot('g1'))
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
  })

  it('guarda una partida rápida y limpia el contador al confirmar', async () => {
    renderCounter()
    await playUntilVictory(30)
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }))

    await waitFor(async () => {
      const matches = await loadMatches()
      expect(matches).toHaveLength(1)
    })
    const [match] = await loadMatches()
    expect(match.type).toBe('quick')
    expect(match.groupId).toBeNull()
    expect(match.winner).toBe('nos')
    expect(match.scores).toEqual({ nos: 30, ellos: 0 })
    expect(typeof match.durationSeconds).toBe('number')
    expect(match.durationSeconds).toBeGreaterThanOrEqual(0)

    await waitFor(async () => {
      const game = await loadGame(QUICK_SLOT)
      expect(game === null || !hasMoves(game)).toBe(true)
    })
  })

  it('guarda una partida de grupo con su groupId al confirmar', async () => {
    renderCounter(groupContext)
    await playUntilVictory(30)
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }))

    await waitFor(async () => {
      const matches = await loadMatches()
      expect(matches).toHaveLength(1)
    })
    const [match] = await loadMatches()
    expect(match.type).toBe('group')
    expect(match.groupId).toBe('g1')
    expect(match.modality).toBe('2v2')
    expect(match.teams.nos.map((p) => p.name)).toEqual(['Juan', 'Pedro'])
  })

  it('no guarda ninguna partida al rechazar la victoria', async () => {
    renderCounter()
    await playUntilVictory(30)
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }))

    await waitFor(async () => {
      expect(await loadMatches()).toHaveLength(0)
    })
    expect(screen.getByTestId('score-nos')).toHaveTextContent('29')
  })

  it('muestra el cronómetro y permite pausar y reanudar', () => {
    renderCounter()
    expect(screen.getByTestId('timer-value')).toHaveTextContent('0:0')

    fireEvent.click(screen.getByRole('button', { name: /pausar partida/i }))
    expect(screen.getByText('Partida pausada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'N' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'E' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar' }))
    expect(screen.queryByText('Partida pausada')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'N' })).toBeEnabled()
  })

  it('no suma puntos mientras la partida está pausada', async () => {
    renderCounter()
    fireEvent.click(screen.getByRole('button', { name: /pausar partida/i }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'N' }))
    fireEvent.pointerUp(screen.getByRole('button', { name: 'N' }))

    expect(screen.getByTestId('score-nos')).toHaveTextContent('0')
    await waitFor(async () => {
      const game = await loadGame(QUICK_SLOT)
      expect(game === null || !hasMoves(game)).toBe(true)
    })
  })
})
