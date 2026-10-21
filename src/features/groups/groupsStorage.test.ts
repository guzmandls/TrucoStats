import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteMatch, loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import {
  deleteGroup,
  leaveGroup,
  loadGroups,
  renameMember,
  saveGroup,
  setGroupInviteCode,
} from './groupsStorage'
import type { Group } from './types'

const group: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
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

  it('guarda el código de invitación sin perder el resto del grupo', async () => {
    await saveGroup(group)
    const updated = await setGroupInviteCode('g1', 'abc123')

    // Un grupo creado en este celular es de su administrador (m1).
    const expected = { ...group, inviteCode: 'abc123', myMemberId: 'm1' }
    expect(updated).toEqual(expected)
    expect(await loadGroups()).toEqual([expected])
  })

  it('no inventa un grupo al guardar el código de uno que no existe', async () => {
    expect(await setGroupInviteCode('nada', 'abc123')).toBeNull()
    expect(await loadGroups()).toEqual([])
  })

  it('cambia el nombre de un integrante en el grupo y en sus partidas', async () => {
    for (const existing of await loadMatches()) {
      await deleteMatch(existing.id)
    }
    await saveGroup(group)
    const match: Match = {
      id: 'p1',
      type: 'group',
      groupId: 'g1',
      modality: '1v1',
      playedAt: '2026-10-05T20:00:00.000Z',
      durationSeconds: 600,
      target: 30,
      winner: 'nos',
      teams: {
        nos: [{ id: 'm1', name: 'Juan' }],
        ellos: [{ id: 'm2', name: 'Pedro' }],
      },
      scores: { nos: 30, ellos: 10 },
    }
    await saveMatch(match)

    const updated = await renameMember('g1', 'm2', 'Pedrito')

    expect(updated?.members.map((member) => member.name)).toEqual([
      'Juan',
      'Pedrito',
    ])
    const [stored] = await loadMatches()
    expect(stored.teams.ellos[0].name).toBe('Pedrito')
    expect(stored.teams.nos[0].name).toBe('Juan')
  })

  it('no hace nada al renombrar en un grupo que no existe', async () => {
    expect(await renameMember('nada', 'm1', 'Ana')).toBeNull()
  })

  it('guarda y recupera un grupo', async () => {
    await saveGroup(group)
    expect(await loadGroups()).toEqual([{ ...group, myMemberId: 'm1' }])
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
    expect(await loadGroups()).toEqual([
      { ...group, name: 'Renombrado', myMemberId: 'm1' },
    ])
  })

  it('un grupo creado antes de las cuentas es de su administrador; uno del servidor no se asume', async () => {
    const withoutMe = { ...group, adminMemberIds: ['m2'] }
    await saveGroup(withoutMe)
    await saveGroup({ ...withoutMe, id: 'g2', inviteCode: 'abc123' })

    const loaded = await loadGroups()

    expect(loaded.find((item) => item.id === 'g1')?.myMemberId).toBe('m2')
    expect(loaded.find((item) => item.id === 'g2')?.myMemberId).toBeUndefined()
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

  it('convierte un grupo guardado con un solo administrador al formato nuevo', async () => {
    const { adminMemberIds, ...rest } = group
    void adminMemberIds
    await saveGroup({ ...rest, adminMemberId: 'm2' } as unknown as Group)

    const [loaded] = await loadGroups()

    expect(loaded.adminMemberIds).toEqual(['m2'])
    expect('adminMemberId' in loaded).toBe(false)
  })

  it('al salir, si queda otro administrador no se transfiere el rol', async () => {
    const twoAdmins: Group = {
      ...group,
      myMemberId: 'm1',
      adminMemberIds: ['m1', 'm2'],
    }
    await saveGroup(twoAdmins)

    await leaveGroup(twoAdmins)

    const [saved] = await loadGroups()
    expect(saved.adminMemberIds).toEqual(['m2'])
  })

  it('transfiere la administración al salir si quedan otros integrantes', async () => {
    await saveGroup(group)
    const result = await leaveGroup(group)
    expect(result).toBe('left')
    const [saved] = await loadGroups()
    expect(saved.adminMemberIds).toEqual(['m2'])
    expect(saved.members).toEqual(group.members)
  })

  it('borra el grupo al salir si el admin es el único integrante', async () => {
    const solo: Group = {
      ...group,
      members: [{ id: 'm1', name: 'Juan' }],
      adminMemberIds: ['m1'],
    }
    await saveGroup(solo)
    const result = await leaveGroup(solo)
    expect(result).toBe('deleted')
    expect(await loadGroups()).toEqual([])
  })
})
