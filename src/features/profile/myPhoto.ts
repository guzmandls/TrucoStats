import { avatarColors } from '../groups/avatar'
import { shareAvatar } from '../groups/avatarSync'
import { updateMemberAvatar } from '../groups/groupsStorage'
import type { Group, Member } from '../groups/types'

// Tu foto es la de tu integrante en cada grupo donde ya sabemos quién eres.
// Cambiarla desde el perfil la cambia en todos.

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
  let problem: string | null = null
  for (const { group, member } of myMembers(groups)) {
    const next = await updateMemberAvatar(group, member.id, dataUrl)
    updated.push(next)
    problem = (await shareAvatar(next, member.id, dataUrl ?? null)) ?? problem
  }
  return {
    groups: groups.map(
      (group) => updated.find((item) => item.id === group.id) ?? group,
    ),
    problem,
  }
}
