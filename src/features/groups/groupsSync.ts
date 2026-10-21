import { getSession, isSessionExpired } from '../../lib/session'
import { loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { fetchGroupByCode, fetchRemoteMatches } from './groupsApi'
import { loadGroups, saveGroup } from './groupsStorage'
import { retryPendingAvatar } from './avatarSync'
import { syncPendingMatches } from './matchesSync'
import type { Group, Member } from './types'

function sameMembers(a: Member[], b: Member[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (member, index) =>
        member.id === b[index].id &&
        member.name === b[index].name &&
        member.avatar === b[index].avatar &&
        JSON.stringify(member.aliases ?? []) ===
          JSON.stringify(b[index].aliases ?? []),
    )
  )
}

// Lo que puede cambiar en una partida ya guardada: los nombres de los
// jugadores, quién la registró y si fue cancelada.
function sameServerState(a: Match, b: Match): boolean {
  return (
    JSON.stringify(a.teams) === JSON.stringify(b.teams) &&
    a.createdBy === b.createdBy &&
    a.registeredAt === b.registeredAt &&
    JSON.stringify(a.canceled ?? null) === JSON.stringify(b.canceled ?? null)
  )
}

// Trae del servidor lo que cambió en el grupo (nombres, fotos, integrantes) y
// las partidas que registraron otros celulares. El servidor manda en lo que ya
// confirmó; lo propio que todavía no se envió no se toca.
// Devuelve true si algo cambió en este celular.
export async function pullGroup(groupId: string): Promise<boolean> {
  const local = (await loadGroups()).find((group) => group.id === groupId)
  if (!local?.inviteCode) {
    return false
  }

  let remote: Group
  let remoteMe: string | null
  let remoteMatches: Match[] = []
  // Si la foto propia no había llegado al servidor, se reintenta antes de traer
  // el grupo (si no, lo que dice el servidor pisaría la foto nueva).
  try {
    await retryPendingAvatar(local)
    // El grupo y las partidas se piden por separado: aunque las partidas fallen
    // (por ejemplo, si la cuenta todavía no está vinculada a un integrante), los
    // nombres, las fotos y los integrantes se actualizan igual.
    const [response, matches] = await Promise.allSettled([
      fetchGroupByCode(local.inviteCode),
      fetchRemoteMatches(local.inviteCode),
    ])
    if (response.status === 'rejected') {
      // Sin conexión: se muestra lo que hay en el celular.
      return false
    }
    remote = response.value.group
    remoteMe = response.value.myMemberId
    if (matches.status === 'fulfilled') {
      remoteMatches = matches.value
    }
  } catch {
    return false
  }
  if (remote.id !== local.id) {
    return false
  }

  let changed = false
  // El servidor sabe qué integrante es esta persona: si el celular no lo tenía
  // guardado (grupos anteriores a las cuentas), se completa para habilitar las
  // opciones que dependen de eso (por ejemplo, las de administrador).
  // Con la sesión iniciada manda el servidor: si dice que la cuenta no es ningún
  // integrante, lo que quedó guardado en el celular (de otra sesión) ya no vale.
  const serverDecides = getSession() !== null && !isSessionExpired()
  const me = serverDecides ? remoteMe : (remoteMe ?? local.myMemberId)
  if (
    remote.name !== local.name ||
    me !== local.myMemberId ||
    JSON.stringify(remote.adminMemberIds) !==
      JSON.stringify(local.adminMemberIds) ||
    !sameMembers(remote.members, local.members)
  ) {
    const { myMemberId: previous, ...rest } = local
    void previous
    await saveGroup({
      ...rest,
      name: remote.name,
      adminMemberIds: remote.adminMemberIds,
      members: remote.members,
      ...(me ? { myMemberId: me } : {}),
    })
    changed = true
  }

  const localMatches = new Map(
    (await loadMatches()).map((match) => [match.id, match]),
  )
  for (const match of remoteMatches) {
    const existing = localMatches.get(match.id)
    if (!existing) {
      await saveMatch({ ...match, syncedAt: new Date().toISOString() })
      changed = true
    } else if (!sameServerState(existing, match)) {
      // Cambió en otro celular (un nombre, o la partida se canceló o restauró).
      const { canceled, ...rest } = existing
      void canceled
      await saveMatch({
        ...rest,
        teams: match.teams,
        ...(match.createdBy ? { createdBy: match.createdBy } : {}),
        ...(match.registeredAt ? { registeredAt: match.registeredAt } : {}),
        ...(match.canceled ? { canceled: match.canceled } : {}),
      })
      changed = true
    }
  }
  return changed
}

// Primero envía lo pendiente y después trae lo nuevo. Devuelve true si hay que
// volver a leer el grupo y sus partidas.
export async function syncGroup(groupId: string): Promise<boolean> {
  const sent = await syncPendingMatches()
  const pulled = await pullGroup(groupId)
  return sent > 0 || pulled
}
