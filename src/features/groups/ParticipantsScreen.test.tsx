import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { MemberScreen } from './MemberScreen'
import { ParticipantsScreen } from './ParticipantsScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los del truco',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
    { id: 'm4', name: 'Ana' },
  ],
}

const match: Match = {
  id: 'match-1',
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  playedAt: '2026-03-01T20:00:00.000Z',
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
}

function renderParticipants() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}/participantes`]}>
      <Routes>
        <Route
          path="/grupo/:id/participantes"
          element={<ParticipantsScreen />}
        />
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<div>ficha</div>}
        />
        <Route path="/grupo/:id" element={<div>grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderMember() {
  return render(
    <MemoryRouter initialEntries={[`/grupo/${group.id}/participantes/m1`]}>
      <Routes>
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<MemberScreen />}
        />
        <Route path="/grupo/:id/participantes" element={<div>lista</div>} />
        <Route path="/grupo/:id" element={<div>grupo</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ParticipantsScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
  })

  it('lista a los integrantes como enlaces', async () => {
    renderParticipants()
    const juan = await screen.findByRole('link', { name: /Juan/ })
    expect(juan).toHaveAttribute('href', `/grupo/${group.id}/participantes/m1`)
    expect(screen.getByRole('link', { name: /Ana/ })).toBeInTheDocument()
  })

  it('abre la ficha al tocar un integrante', async () => {
    renderParticipants()
    fireEvent.click(await screen.findByRole('link', { name: /Juan/ }))
    expect(await screen.findByText('ficha')).toBeInTheDocument()
  })

  it('vuelve al grupo con el botón de la barra', async () => {
    renderParticipants()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('grupo')).toBeInTheDocument()
  })
})

describe('ParticipantsScreen (administración)', () => {
  const adminGroup: Group = {
    ...group,
    inviteCode: 'abc123',
    myMemberId: 'm1',
    adminMemberIds: ['m1', 'm2'],
  }
  let calls: { method: string; path: string; body: string | null }[]

  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init: RequestInit = {}) => {
        const method = init.method ?? 'GET'
        calls.push({ method, path, body: (init.body as string) ?? null })
        if (path.endsWith('/partidas')) {
          return new Response(JSON.stringify({ matches: [] }), { status: 200 })
        }
        if (method === 'GET') {
          return new Response(
            JSON.stringify({
              group: { ...adminGroup, myMemberId: undefined },
              inviteCode: 'abc123',
              claimedMemberIds: ['m1', 'm2'],
              myMemberId: 'm1',
            }),
            { status: 200 },
          )
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra un escudo junto a cada administrador', async () => {
    await saveGroup(adminGroup)
    renderParticipants()

    await screen.findByRole('link', { name: /Juan/ })
    expect(screen.getAllByRole('img', { name: 'Administrador' })).toHaveLength(
      2,
    )
  })

  it('un integrante común no ve el menú de opciones', async () => {
    await saveGroup({ ...adminGroup, myMemberId: 'm3' })
    renderParticipants()

    await screen.findByRole('link', { name: /Juan/ })
    expect(screen.queryByRole('button', { name: /Opciones de/ })).toBeNull()
  })

  it('el administrador da el rol de administrador a otro integrante', async () => {
    await saveGroup({ ...adminGroup, adminMemberIds: ['m1'] })
    renderParticipants()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Pedro' }),
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Hacer administrador' }),
    )

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: '/api/grupos/abc123/integrantes/m2/administrador',
        body: JSON.stringify({ admin: true }),
      }),
    )
  })

  it('pide confirmación antes de dar de baja a un integrante', async () => {
    await saveGroup(adminGroup)
    renderParticipants()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Luis' }),
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Dar de baja' }),
    )
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    fireEvent.click(await screen.findByRole('button', { name: 'Dar de baja' }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'DELETE',
        path: '/api/grupos/abc123/integrantes/m3',
        body: null,
      }),
    )
  })

  it('solo ofrece liberar a quien ya fue elegido y no es uno mismo', async () => {
    await saveGroup(adminGroup)
    renderParticipants()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Juan' }),
    )
    expect(
      screen.queryByRole('menuitem', { name: 'Liberar integrante' }),
    ).toBeNull()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Pedro' }),
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Liberar integrante' }),
    ).toBeInTheDocument()
  })
})

describe('MemberScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
  })

  it('muestra las estadísticas personales del integrante', async () => {
    await saveMatch(match)
    renderMember()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Participante' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Detalle')).toBeInTheDocument()
    expect(screen.getByText('Al que más le gana')).toBeInTheDocument()
  })

  it('el administrador puede cambiar el nombre de un integrante que nadie eligió', async () => {
    await deleteGroup(group.id)
    await saveGroup({ ...group, inviteCode: 'abc123', myMemberId: 'm2' })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              group,
              inviteCode: 'abc123',
              claimedMemberIds: ['m2'],
              myMemberId: 'm2',
            }),
            { status: 200 },
          ),
      ),
    )
    // Juan (m1) no es la persona de este celular: la persona es administradora.
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      inviteCode: 'abc123',
      myMemberId: 'm2',
      adminMemberIds: ['m2'],
    })
    renderMember()

    expect(
      await screen.findByRole('button', { name: 'Cambiar nombre' }),
    ).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('no ofrece cambiar el nombre de quien ya eligió su lugar (salvo él mismo)', async () => {
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      inviteCode: 'abc123',
      myMemberId: 'm2',
      adminMemberIds: ['m2'],
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              group,
              inviteCode: 'abc123',
              claimedMemberIds: ['m1', 'm2'],
              myMemberId: 'm2',
            }),
            { status: 200 },
          ),
      ),
    )
    renderMember()

    await screen.findByText('Detalle')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('button', { name: 'Cambiar nombre' })).toBeNull()
    vi.unstubAllGlobals()
  })

  it('cada integrante puede cambiar su propio nombre', async () => {
    await deleteGroup(group.id)
    await saveGroup({ ...group, inviteCode: 'abc123', myMemberId: 'm1' })
    renderMember()

    expect(
      await screen.findByRole('button', { name: 'Cambiar nombre' }),
    ).toBeInTheDocument()
  })

  it('muestra los apodos y deja editarlos al administrador', async () => {
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      inviteCode: 'abc123',
      myMemberId: 'm1',
      members: [
        { id: 'm1', name: 'Juan', aliases: ['Juancho'] },
        ...group.members.slice(1),
      ],
    })
    renderMember()

    expect(await screen.findByText('Juancho')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Editar apodos' }),
    ).toBeInTheDocument()
  })

  it('quien no es administrador no puede editar los apodos de otro', async () => {
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      inviteCode: 'abc123',
      myMemberId: 'm2',
      members: [
        { id: 'm1', name: 'Juan', aliases: ['Juancho'] },
        ...group.members.slice(1),
      ],
    })
    renderMember()

    expect(await screen.findByText('Juancho')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar apodos' })).toBeNull()
  })

  it('permite elegir una foto aunque todavía no haya jugado', async () => {
    renderMember()
    expect(
      await screen.findByRole('button', { name: 'Elige foto' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Detalle')).toBeInTheDocument()
  })
})
