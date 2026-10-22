import 'fake-indexeddb/auto'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearSession, saveSession } from '../../lib/session'
import { deleteGroup, loadGroups, saveGroup } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { EditProfileScreen } from './EditProfileScreen'

const PHOTO = 'data:image/jpeg;base64,AAA'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [{ id: 'm1', name: 'Juan', avatar: PHOTO }],
  myMemberId: 'm1',
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/perfil/editar']}>
      <Routes>
        <Route path="/perfil/editar" element={<EditProfileScreen />} />
        <Route path="/perfil" element={<div>perfil</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  for (const existing of await loadGroups()) {
    await deleteGroup(existing.id)
  }
})

afterEach(() => clearSession())

describe('EditProfileScreen', () => {
  it('muestra la foto actual y al tocarla la abre en pantalla completa', async () => {
    await saveGroup(group)
    renderEdit()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver foto' }))
    const viewer = screen.getByRole('dialog', { name: 'Foto de perfil' })
    expect(within(viewer).getByRole('img')).toHaveAttribute('src', PHOTO)

    fireEvent.click(within(viewer).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Cambiar foto" permite quitarla en todos tus grupos', async () => {
    await saveGroup(group)
    await saveGroup({ ...group, id: 'g2', name: 'Otros' })
    renderEdit()

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar foto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar foto' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar foto' }))

    await waitFor(async () => {
      const groups = await loadGroups()
      expect(groups.map((item) => item.members[0].avatar)).toEqual([
        undefined,
        undefined,
      ])
    })
  })

  it('sin foto, tocar la silueta abre para agregar una', async () => {
    await saveGroup({ ...group, members: [{ id: 'm1', name: 'Juan' }] })
    renderEdit()

    fireEvent.click(await screen.findByRole('button', { name: 'Elegir foto' }))
    expect(
      screen.getByRole('dialog', { name: 'Editar foto' }),
    ).toBeInTheDocument()
  })

  it('con cuenta registrada muestra usuario, correo, contraseña y eliminar cuenta', async () => {
    saveSession({
      token: 'b'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
    renderEdit()

    expect(await screen.findByText('Usuario')).toBeInTheDocument()
    expect(screen.getByText('Correo')).toBeInTheDocument()
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Eliminar cuenta' }),
    ).toBeInTheDocument()
  })

  it('vuelve al perfil con el botón de la barra', async () => {
    renderEdit()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('perfil')).toBeInTheDocument()
  })
})
