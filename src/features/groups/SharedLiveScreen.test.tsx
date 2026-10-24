import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SharedLiveScreen } from './SharedLiveScreen'

const ID = '0123456789abcdef0123456789abcdef'

function renderShared() {
  return render(
    <MemoryRouter initialEntries={[`/en-vivo/${ID}`]}>
      <Routes>
        <Route path="/en-vivo/:shareId" element={<SharedLiveScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

function serve(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mirar una partida compartida', () => {
  it('muestra el marcador sin necesitar cuenta', async () => {
    const fetchMock = serve(200, {
      live: {
        id: ID,
        state: {
          teams: { nos: [], ellos: [] },
          target: 30,
          scores: { nos: 9, ellos: 4 },
          paused: false,
          elapsedSeconds: 120,
          winner: null,
        },
        startedAt: '2026-10-24T20:00:00.000Z',
        updatedAt: '2026-10-24T20:02:00.000Z',
        ageSeconds: 0,
        status: 'live',
        endedAt: null,
        reason: null,
      },
    })
    renderShared()

    expect(await screen.findByTestId('live-score-nos')).toHaveTextContent('9')
    expect(screen.getByTestId('live-score-ellos')).toHaveTextContent('4')
    expect(screen.getByText('Nosotros')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Mirando en vivo · a 30',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/en-vivo/${ID}`,
      expect.anything(),
    )
  })

  it('si no existe lo dice', async () => {
    serve(404, { error: 'No se encontró la partida' })
    renderShared()
    expect(
      await screen.findByText(
        'La partida ya terminó o el enlace no está completo.',
      ),
    ).toBeInTheDocument()
  })
})
