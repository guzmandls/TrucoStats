import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
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

  it('un integrante común solo ve el menú de su propia tarjeta, sin acciones de administración', async () => {
    await saveGroup({ ...adminGroup, myMemberId: 'm3' })
    renderParticipants()

    await screen.findByRole('link', { name: /Juan/ })
    expect(
      screen.queryByRole('button', { name: 'Opciones de Juan' }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Luis' }))
    expect(
      screen.getByRole('menuitem', { name: 'Cambiar nombre' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Editar apodos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: 'Eliminar del grupo' }),
    ).toBeNull()
  })

  it('el administrador cambia el nombre de un integrante que nadie eligió', async () => {
    await saveGroup({ ...adminGroup, adminMemberIds: ['m1'] })
    renderParticipants()

    // Pedro (m2) ya fue elegido; Luis (m3) no. Se espera a que llegue del
    // servidor quién eligió a quién.
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'GET')).toBe(true),
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Pedro' }),
    )
    expect(
      screen.queryByRole('menuitem', { name: 'Cambiar nombre' }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Luis' }))
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Cambiar nombre' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Luisito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/api/grupos/abc123/integrantes/m3',
        body: JSON.stringify({ name: 'Luisito' }),
      }),
    )
  })

  it('el administrador edita los apodos de un integrante', async () => {
    await saveGroup(adminGroup)
    renderParticipants()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Luis' }),
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Editar apodos' }),
    )
    fireEvent.change(screen.getByLabelText('Apodos'), {
      target: { value: 'Lucho, Luisito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PUT',
        path: '/api/grupos/abc123/integrantes/m3/apodos',
        body: JSON.stringify({ aliases: ['Lucho', 'Luisito'] }),
      }),
    )
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

  it('pide confirmación antes de eliminar a un integrante del grupo', async () => {
    await saveGroup(adminGroup)
    renderParticipants()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Opciones de Luis' }),
    )
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Eliminar del grupo' }),
    )
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))

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

  it('muestra los apodos solo si el integrante los tiene', async () => {
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      members: [
        { id: 'm1', name: 'Juan', aliases: ['Juancho'] },
        ...group.members.slice(1),
      ],
    })
    renderMember()

    expect(await screen.findByText('Juancho')).toBeInTheDocument()
    expect(screen.getByText('Apodos')).toBeInTheDocument()
  })

  it('sin apodos no aparece la sección de apodos', async () => {
    renderMember()

    await screen.findByText('Detalle')
    expect(screen.queryByText('Apodos')).toBeNull()
    expect(screen.queryByText('Sin apodos')).toBeNull()
  })

  it('al tocar la foto se abre la edición, también si todavía no jugó', async () => {
    renderMember()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar foto' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Editar foto')
    expect(
      within(dialog).getByRole('button', { name: 'Agregar foto' }),
    ).toBeInTheDocument()
    // Sin foto no hay nada que quitar.
    expect(
      within(dialog).queryByRole('button', { name: 'Quitar foto' }),
    ).toBeNull()
    // Ya no existe el botón "Elige foto" ocupando lugar en la pantalla.
    expect(screen.queryByText('Elige foto')).toBeNull()
  })

  it('con foto ofrece cambiarla o quitarla', async () => {
    await deleteGroup(group.id)
    await saveGroup({
      ...group,
      members: [
        { id: 'm1', name: 'Juan', avatar: 'data:image/jpeg;base64,AAA' },
        ...group.members.slice(1),
      ],
    })
    renderMember()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar foto' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: 'Cambiar foto' }),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar foto' }))
    await waitFor(async () => {
      const [stored] = await loadGroups()
      expect(stored.members[0].avatar).toBeUndefined()
    })
  })

  it('en un grupo del servidor solo edita la foto quien es ese integrante o un administrador', async () => {
    await deleteGroup(group.id)
    await saveGroup({ ...group, inviteCode: 'abc123', myMemberId: 'm3' })
    renderMember()

    await screen.findByText('Detalle')
    expect(screen.queryByRole('button', { name: 'Editar foto' })).toBeNull()
  })
})
