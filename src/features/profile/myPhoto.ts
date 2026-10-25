import { avatarColors } from '../groups/avatar'
import { getSession, isRegistered } from '../../lib/session'
import { pendingAvatarKey, shareAvatar } from '../groups/avatarSync'
import { setAccountAvatar } from '../groups/groupsApi'
import { updateMemberAvatar } from '../groups/groupsStorage'
import type { Group, Member } from '../groups/types'

// Tu foto es la de tu cuenta: la misma en cada grupo donde ya sabemos quién
// eres. Cambiarla (desde el perfil o desde un grupo) la cambia en todos.

export interface MyMember {
  group: Group
  member: Member
}

export function myMembers(groups: Group[]): MyMember[] {
  return groups.flatMap((group) => {
    const member = group.members.find((item) => item.id === group.myMemberId)
    return member ? [{ group, member }] : []
  })
}

// Lo necesario para dibujar tu foto (o tu silueta de color si no tienes foto).
// null si en ningún grupo se sabe quién eres.
export function myPhoto(
  groups: Group[],
): { name: string; color: string; src?: string } | null {
  const mine = myMembers(groups)
  const first = mine[0]
  if (!first) {
    return null
  }
  return {
    name: first.member.name,
    color: avatarColors(first.group.members.map((item) => item.id))[
      first.member.id
    ],
    src: mine.find((item) => item.member.avatar)?.member.avatar,
  }
}

// Cambia (o quita, con undefined) tu foto en todos tus grupos. Devuelve los
// grupos actualizados y, si no llegó al servidor, el aviso para mostrar.
export async function applyMyPhoto(
  groups: Group[],
  dataUrl: string | undefined,
): Promise<{ groups: Group[]; problem: string | null }> {
  const updated: Group[] = []
  for (const { group, member } of myMembers(groups)) {
    updated.push(await updateMemberAvatar(group, member.id, dataUrl))
  }
  let problem: string | null = null
  // Con cuenta, un solo pedido la cambia en todos los grupos del servidor. Si no
  // llega (o no hay cuenta), se envía grupo por grupo y lo que falle queda
  // pendiente para reintentar.
  let sent = false
  if (isRegistered(getSession())) {
    try {
      await setAccountAvatar(dataUrl ?? null)
      sent = true
    } catch {
      sent = false
    }
  }
  for (const group of updated) {
    if (sent) {
      clearPending(group.id)
    } else if (group.myMemberId) {
      problem =
        (await shareAvatar(group, group.myMemberId, dataUrl ?? null)) ?? problem
    }
  }
  return {
    groups: groups.map(
      (group) => updated.find((item) => item.id === group.id) ?? group,
    ),
    problem,
  }
}

function clearPending(groupId: string): void {
  try {
    localStorage.removeItem(pendingAvatarKey(groupId))
  } catch {
    // Sin almacenamiento no había nada pendiente anotado.
  }
}
