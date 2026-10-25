import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from './matchesStorage'
import { QuickMatchesScreen } from './QuickMatchesScreen'
import type { Match } from './types'

const match: Match = {
  id: 'r1',
  type: 'quick',
  groupId: null,
  modality: null,
  playedAt: '2026-10-20T20:00:00.000Z',
  durationSeconds: 600,
  target: 30,
  winner: 'ellos',
  teams: { nos: [], ellos: [] },
  scores: { nos: 18, ellos: 30 },
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/partidas-rapidas']}>
      <Routes>
        <Route path="/partidas-rapidas" element={<QuickMatchesScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  for (const existing of await loadMatches()) {
    await deleteMatch(existing.id)
  }
})

describe('historial de partidas rápidas', () => {
  it('muestra Nosotros contra Ellos con el marcador, sin fotos ni puntos', async () => {
    await saveMatch(match)
    renderScreen()

    const row = await screen.findByTestId('partida')
    expect(row).toHaveTextContent('Nosotros')
    expect(row).toHaveTextContent('Ellos')
    expect(row).toHaveTextContent('18')
    expect(row).toHaveTextContent('30')
    expect(row).not.toHaveTextContent('Pts')
    expect(row.querySelector('img')).toBeNull()
  })

  it('elimina una partida después de confirmar, sin dejarla cancelada', async () => {
    await saveMatch(match)
    renderScreen()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de la partida' }),
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar partida' }))
    expect(screen.getByText('¿Eliminar la partida?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))

    expect(
      await screen.findByText('Todavía no hay partidas'),
    ).toBeInTheDocument()
    await waitFor(async () => expect(await loadMatches()).toHaveLength(0))
  })

  it('sin partidas lo dice', async () => {
    renderScreen()
    expect(
      await screen.findByText('Todavía no hay partidas'),
    ).toBeInTheDocument()
  })
})
