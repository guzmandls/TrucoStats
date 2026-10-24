import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { CounterScreen } from './CounterScreen'
import { clearGame, groupSlot, QUICK_SLOT } from './gameStorage'
import type { GameContext } from './gameContext'

interface Call {
  method: string
  path: string
  body: string | null
}

let calls: Call[]

function renderCounter(gameContext?: GameContext) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/partida', state: gameContext ? { gameContext } : null },
      ]}
    >
      <Routes>
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function login() {
  saveSession({
    token: 't'.repeat(64),
    user: { id: 'u1', username: 'juan', email: null, name: 'Juan' },
  })
}

function press(label: string) {
  const button = screen.getByRole('button', { name: label })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
}

function shareCalls() {
  return calls.filter(
    (call) => call.method === 'PUT' && call.path.startsWith('/api/en-vivo/'),
  )
}

async function openShare() {
  fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Compartir en vivo' }),
  )
}

beforeEach(async () => {
  calls = []
  await clearGame(QUICK_SLOT)
  await clearGame(groupSlot('g1'))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init: RequestInit = {}) => {
      calls.push({
        method: init.method ?? 'GET',
        path,
        body: (init.body as string) ?? null,
      })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('compartir en vivo la partida rápida', () => {
  it('sin cuenta la opción no aparece', () => {
    renderCounter()
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    expect(
      screen.queryByRole('button', { name: 'Compartir en vivo' }),
    ).not.toBeInTheDocument()
    expect(shareCalls()).toHaveLength(0)
  })

  it('con cuenta muestra el QR y el enlace, y publica la partida', async () => {
    login()
    renderCounter()
    await openShare()

    expect(
      screen.getByRole('img', { name: 'Código QR de la partida en vivo' }),
    ).toBeInTheDocument()
    const link = (
      screen.getByLabelText('Enlace de la partida en vivo') as HTMLInputElement
    ).value
    expect(link).toMatch(/\/en-vivo\/[0-9a-f]{32}$/)
    const shareId = link.split('/').pop()

    await waitFor(() => expect(shareCalls().length).toBeGreaterThan(0))
    expect(shareCalls()[0].path).toBe(`/api/en-vivo/${shareId}`)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await act(async () => press('N'))
    await waitFor(() =>
      expect(JSON.parse(shareCalls().at(-1)!.body!).state.scores.nos).toBe(1),
    )

    // Volver a abrirlo muestra el mismo enlace.
    await openShare()
    expect(
      (
        screen.getByLabelText(
          'Enlace de la partida en vivo',
        ) as HTMLInputElement
      ).value,
    ).toBe(link)
  })

  it('al cancelarla avisa a quien mira que se canceló', async () => {
    login()
    renderCounter()
    await openShare()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await act(async () => press('N'))

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))

    await waitFor(() =>
      expect(JSON.parse(shareCalls().at(-1)!.body!)).toMatchObject({
        status: 'canceled',
        state: { scores: { nos: 1 } },
      }),
    )
  })

  it('la partida de grupo no tiene esta opción, aunque haya cuenta', async () => {
    login()
    renderCounter({
      type: 'group',
      groupId: 'g1',
      liveId: 'live-1',
      modality: '1v1',
      teams: {
        nos: [{ id: 'm1', name: 'Juan' }],
        ellos: [{ id: 'm2', name: 'Pedro' }],
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    expect(
      screen.queryByRole('button', { name: 'Compartir en vivo' }),
    ).not.toBeInTheDocument()
  })
})
