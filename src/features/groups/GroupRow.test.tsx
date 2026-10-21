import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { GroupOverview } from '../matches/groupOverview'
import type { Match } from '../matches/types'
import { GroupRow } from './GroupRow'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los del Truco',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
    { id: 'm4', name: 'Ana' },
    { id: 'm5', name: 'Beto' },
    { id: 'm6', name: 'Rita' },
  ],
  myMemberId: 'm1',
}

const last: Match = {
  id: 'p1',
  type: 'group',
  groupId: 'g1',
  modality: '1v1',
  playedAt: new Date().toISOString(),
  durationSeconds: 600,
  target: 30,
  winner: 'nos',
  teams: {
    nos: [{ id: 'm1', name: 'Juan' }],
    ellos: [{ id: 'm2', name: 'Pedro' }],
  },
  scores: { nos: 30, ellos: 21 },
}

function overview(extra: Partial<GroupOverview> = {}): GroupOverview {
  return {
    ranking: group.members,
    position: 1,
    points: 105,
    memberCount: group.members.length,
    matchCount: 12,
    last,
    ...extra,
  }
}

function renderRow(over: GroupOverview, pending = 0) {
  return render(
    <MemoryRouter>
      <GroupRow group={group} overview={over} pending={pending} />
    </MemoryRouter>,
  )
}

describe('GroupRow', () => {
  it('lleva al grupo y muestra el nombre y las cantidades', () => {
    renderRow(overview())

    expect(screen.getByRole('link')).toHaveAttribute('href', '/grupo/g1')
    expect(screen.getByText('Los del Truco')).toBeInTheDocument()
    expect(
      screen.getByText('6 integrantes · 12 partidas jugadas'),
    ).toBeInTheDocument()
  })

  it('usa el singular cuando hay uno solo', () => {
    renderRow(overview({ memberCount: 1, matchCount: 1 }))

    expect(
      screen.getByText('1 integrante · 1 partida jugada'),
    ).toBeInTheDocument()
  })

  it('muestra hasta 8 avatares, en el orden del ranking, y sin contador', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `x${index}`,
      name: `Jugador ${index}`,
    }))
    render(
      <MemoryRouter>
        <GroupRow
          group={{ ...group, members: many }}
          overview={overview({ ranking: many, memberCount: 12 })}
          pending={0}
        />
      </MemoryRouter>,
    )

    const avatars = screen.getAllByRole('img')
    expect(avatars).toHaveLength(8)
    expect(avatars[0]).toHaveAccessibleName('Jugador 0')
    expect(avatars[7]).toHaveAccessibleName('Jugador 7')
    expect(screen.queryByText(/^[+]/)).not.toBeInTheDocument()
  })

  it('muestra todos los avatares si son 8 o menos', () => {
    renderRow(overview())

    expect(screen.getAllByRole('img')).toHaveLength(6)
  })

  it('muestra la última partida', () => {
    renderRow(overview())

    expect(
      screen.getByText('Última: ganaste 30 – 21 · hoy'),
    ).toBeInTheDocument()
  })

  it('sin partidas dice que todavía no hay y no muestra puntos ni posición', () => {
    renderRow(
      overview({ position: null, points: 0, matchCount: 0, last: null }),
    )

    expect(screen.getByText('Sin partidas todavía')).toBeInTheDocument()
    expect(screen.queryByText('Pts')).not.toBeInTheDocument()
    expect(screen.queryByText(/º/)).not.toBeInTheDocument()
  })

  it('los tres primeros llevan trofeo con su posición y tus puntos', () => {
    const { container } = renderRow(overview({ position: 2 }))

    expect(screen.getByText('2º')).toBeInTheDocument()
    expect(container.querySelector('svg path[style]')).not.toBeNull()
    expect(screen.getByText('105')).toBeInTheDocument()
    expect(screen.getByText(/Pts/)).toBeInTheDocument()
  })

  it('del cuarto en adelante solo muestra el número, sin trofeo', () => {
    const { container } = renderRow(overview({ position: 5 }))

    expect(screen.getByText('5º')).toBeInTheDocument()
    expect(container.querySelector('svg path[style]')).toBeNull()
  })

  it('con partidas pero sin posición todavía muestra solo los puntos', () => {
    renderRow(overview({ position: null, points: 0 }))

    expect(screen.queryByText(/º/)).not.toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('avisa cuántas partidas están sin enviar', () => {
    renderRow(overview(), 2)

    expect(
      screen.getByRole('status', { name: '2 partidas sin enviar' }),
    ).toBeInTheDocument()
  })

  it('no muestra el aviso si no hay pendientes', () => {
    renderRow(overview(), 0)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
