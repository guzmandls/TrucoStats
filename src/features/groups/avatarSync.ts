import { ApiError } from '../../lib/api'
import { setRemoteAvatar } from './groupsApi'
import type { Group } from './types'

const pendingKey = (groupId: string) => `trucostats.pendingAvatar.${groupId}`

function markPending(groupId: string, pending: boolean): void {
  try {
    if (pending) {
      localStorage.setItem(pendingKey(groupId), '1')
    } else {
      localStorage.removeItem(pendingKey(groupId))
    }
  } catch {
    // Sin almacenamiento no se puede recordar que falta enviar la foto.
  }
}

// Si la última foto de este celular todavía no llegó al servidor.
export function hasPendingAvatar(groupId: string): boolean {
  try {
    return localStorage.getItem(pendingKey(groupId)) === '1'
  } catch {
    return false
  }
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Inicia sesión para compartir tu foto con los demás.'
    }
    if (error.status === 403) {
      return 'Tu cuenta no está vinculada a ese integrante, así que la foto quedó solo en este celular.'
    }
    return error.message
  }
  return 'Sin conexión: la foto quedó solo en este celular y se enviará cuando haya conexión.'
}

// Comparte la foto de un integrante con los demás celulares. Devuelve null si
// llegó (o si el grupo todavía no está en el servidor) y, si no, un mensaje para
// mostrar. Mientras no llegue, queda anotada para reintentar al sincronizar el
// grupo.
export async function shareAvatar(
  group: Group,
  memberId: string,
  avatar: string | null,
): Promise<string | null> {
  if (!group.inviteCode) {
    return null
  }
  try {
    await setRemoteAvatar(group.inviteCode, memberId, avatar)
    markPending(group.id, false)
    return null
  } catch (error) {
    markPending(group.id, true)
    return messageFor(error)
  }
}

// Reintenta enviar la foto propia si había quedado pendiente. Devuelve true si
// había algo pendiente que se pudo enviar.
export async function retryPendingAvatar(group: Group): Promise<boolean> {
  if (!group.inviteCode || !group.myMemberId || !hasPendingAvatar(group.id)) {
    return false
  }
  const mine = group.members.find((member) => member.id === group.myMemberId)
  try {
    await setRemoteAvatar(
      group.inviteCode,
      group.myMemberId,
      mine?.avatar ?? null,
    )
    markPending(group.id, false)
    return true
  } catch {
    return false
  }
}
