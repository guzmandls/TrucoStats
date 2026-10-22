import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { RenameGroupDialog } from './RenameGroupDialog'
import type { Group } from './types'

const shared: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [{ id: 'm1', name: 'Juan' }],
  myMemberId: 'm1',
  inviteCode: 'c'.repeat(32),
}

beforeEach(async () => {
  for (const group of await loadGroups()) {
    await deleteGroup(group.id)
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function rename(group: Group, name: string, onSaved = vi.fn()) {
  render(
    <RenameGroupDialog group={group} onClose={() => {}} onSaved={onSaved} />,
  )
  expect(screen.getByLabelText('Nombre del grupo')).toHaveValue(group.name)
  fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
    target: { value: name },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  return onSaved
}

describe('RenameGroupDialog', () => {
  it('cambia el nombre en el servidor y en este celular', async () => {
    await saveGroup(shared)
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ name: 'Los del jueves' })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const onSaved = rename(shared, ' Los del jueves ')

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Los del jueves' }),
      ),
    )
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe(`/api/grupos/${shared.inviteCode}`)
    expect(init.method).toBe('PATCH')
    expect((await loadGroups())[0].name).toBe('Los del jueves')
  })

  it('un grupo que no se compartió se renombra sin conexión', async () => {
    const local: Group = { ...shared, inviteCode: undefined }
    await saveGroup(local)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const onSaved = rename(local, 'Solo acá')

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await loadGroups())[0].name).toBe('Solo acá')
  })

  it('sin conexión avisa y no cambia nada', async () => {
    await saveGroup(shared)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('sin red')
      }),
    )

    const onSaved = rename(shared, 'Otro')

    expect(
      await screen.findByText(/Necesitas conexión a Internet/),
    ).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    expect((await loadGroups())[0].name).toBe('Los pibes')
  })
})
