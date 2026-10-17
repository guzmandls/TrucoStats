import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearFinishedGames, saveFinishedGame } from './gameStorage'
import { HistoryScreen } from './HistoryScreen'

describe('HistoryScreen', () => {
  beforeEach(async () => {
    await clearFinishedGames()
  })

  it('muestra un mensaje cuando no hay partidas', async () => {
    render(<HistoryScreen onClose={() => undefined} />)
    expect(
      await screen.findByText(/todavía no hay partidas finalizadas/i),
    ).toBeInTheDocument()
  })

  it('lista las partidas finalizadas con su ganador', async () => {
    await saveFinishedGame({
      playedAt: Date.now(),
      target: 30,
      nos: 30,
      ellos: 12,
      winner: 'nos',
    })
    render(<HistoryScreen onClose={() => undefined} />)
    expect(
      await screen.findByText(/nosotros 30 – 12 ellos/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/ganó nosotros/i)).toBeInTheDocument()
  })

  it('llama a onClose al tocar Volver', () => {
    const onClose = vi.fn()
    render(<HistoryScreen onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /volver/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
