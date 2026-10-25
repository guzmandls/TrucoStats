import { apiRequest } from '../../lib/api'
import { clearGame, groupSlot } from '../counter/gameStorage'
import { deleteMatch, loadMatches } from '../matches/matchesStorage'
import {
  clearAccountQuickMatches,
  pullQuickMatches,
  syncQuickMatches,
} from '../matches/quickSync'
import { pendingAvatarKey } from './avatarSync'
import { fetchGroupByCode } from './groupsApi'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { pullGroup } from './groupsSync'
import { isPending } from './matchesSync'
import { addMembership, clearMembership } from './membership'

// Cuántas partidas de grupo se jugaron en este celular y todavía no llegaron al
// servidor (se perderían al cerrar sesión).
export async function countUnsentGroupMatches(): Promise<number> {
  const matches = await loadMatches()
  return matches.filter((match) => match.groupId !== null && isPending(match))
    .length
}

// Al cerrar sesión, los grupos y las partidas de grupo son de esa cuenta y no
// pueden quedar a la vista de quien use el celular después. Lo mismo las
// partidas rápidas que ya están en la cuenta; las que no se subieron se
// conservan.
export async function clearAccountData(): Promise<void> {
  for (const group of await loadGroups()) {
    await deleteGroup(group.id)
    await clearGame(groupSlot(group.id))
    try {
      localStorage.removeItem(pendingAvatarKey(group.id))
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  }
  for (const match of await loadMatches()) {
    if (match.groupId !== null) {
      await deleteMatch(match.id)
    }
  }
  await clearAccountQuickMatches()
  clearMembership()
}

// Al iniciar sesión, trae de nuevo los grupos de la cuenta. Nunca falla: sin
// conexión simplemente no aparecen hasta la próxima vez.
export async function restoreAccountGroups(): Promise<void> {
  try {
    const { inviteCodes } = await apiRequest<{ inviteCodes: string[] }>(
      '/api/mis-grupos',
    )
    for (const code of inviteCodes) {
      const { group, myMemberId } = await fetchGroupByCode(code)
      if (!myMemberId) {
        continue
      }
      await saveGroup({ ...group, myMemberId })
      addMembership(group.id)
      await pullGroup(group.id)
    }
  } catch {
    // Se vuelve a intentar al abrir la app o el grupo.
  }
  // Las partidas rápidas de la cuenta, y las de este celular que no se subieron.
  await pullQuickMatches()
  await syncQuickMatches()
}
