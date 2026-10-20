import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteGroup, leaveGroup, loadGroups, saveGroup } from './groupsStorage'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberId: 'm1',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
  ],
}

describe('groupsStorage', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
  })

  it('devuelve una lista vacía cuando no hay grupos', async () => {
    expect(await loadGroups()).toEqual([])
  })

  it('guarda y recupera un grupo', async () => {
    await saveGroup(group)
    expect(await loadGroups()).toEqual([group])
  })

  it('guarda varios grupos', async () => {
    await saveGroup(group)
    await saveGroup({ ...group, id: 'g2', name: 'Otros' })
    const names = (await loadGroups()).map((saved) => saved.name).sort()
    expect(names).toEqual(['Los pibes', 'Otros'])
  })

  it('reemplaza el grupo al guardar el mismo id', async () => {
    await saveGroup(group)
    await saveGroup({ ...group, name: 'Renombrado' })
    expect(await loadGroups()).toEqual([{ ...group, name: 'Renombrado' }])
  })

  it('elimina un grupo', async () => {
    await saveGroup(group)
    await deleteGroup('g1')
    expect(await loadGroups()).toEqual([])
  })

  it('ignora registros con forma inválida', async () => {
    await saveGroup({ id: 'invalido' } as never)
    expect(await loadGroups()).toEqual([])
  })

  it('transfiere la administración al salir si quedan otros integrantes', async () => {
    await saveGroup(group)
    const result = await leaveGroup(group)
    expect(result).toBe('left')
    const [saved] = await loadGroups()
    expect(saved.adminMemberId).toBe('m2')
    expect(saved.members).toEqual(group.members)
  })

  it('borra el grupo al salir si el admin es el único integrante', async () => {
    const solo: Group = {
      ...group,
      members: [{ id: 'm1', name: 'Juan' }],
      adminMemberId: 'm1',
    }
    await saveGroup(solo)
    const result = await leaveGroup(solo)
    expect(result).toBe('deleted')
    expect(await loadGroups()).toEqual([])
  })
})
