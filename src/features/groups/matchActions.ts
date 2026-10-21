import type { Match } from '../matches/types'
import type { Group } from './types'
import { isPending } from './matchesSync'

export type MatchAction = 'cancel' | 'restore'

// Quien no es administrador tiene una hora: para cancelar la partida que
// registró (desde que el servidor la recibió) y para restaurar la que canceló
// (desde que la canceló). El servidor lo vuelve a comprobar.
export const NON_ADMIN_WINDOW_MS = 60 * 60 * 1000

function withinWindow(since: string | undefined, now: number): boolean {
  return since !== undefined && now - Date.parse(since) <= NON_ADMIN_WINDOW_MS
}

// Qué puede hacer esta persona con una partida del historial:
// - cancelar: el administrador siempre; quien la registró, dentro de la hora;
// - restaurar: el administrador siempre; quien la canceló, dentro de la hora.
// Una partida que todavía no se envió es de esta persona (la registró en este
// celular) y todavía no corre ningún plazo.
export function availableActions(
  match: Match,
  group: Group,
  now = Date.now(),
): MatchAction[] {
  const me = group.myMemberId
  if (!me) {
    return []
  }
  const isAdmin = group.adminMemberIds.includes(me)
  if (match.canceled) {
    const mine = match.canceled.by === me
    return isAdmin || (mine && withinWindow(match.canceled.at, now))
      ? ['restore']
      : []
  }
  if (isAdmin || isPending(match)) {
    return ['cancel']
  }
  return match.createdBy === me && withinWindow(match.registeredAt, now)
    ? ['cancel']
    : []
}
