import type { Match } from '../matches/types'
import type { Group } from './types'
import { isPending } from './matchesSync'

export type MatchAction = 'cancel' | 'restore'

// Qué puede hacer esta persona con una partida del historial:
// - cancelar: el administrador o quien la registró;
// - restaurar: el administrador o quien la canceló.
// Una partida que todavía no se envió es de esta persona (la registró en este
// celular).
export function availableActions(match: Match, group: Group): MatchAction[] {
  const me = group.myMemberId
  if (!me) {
    return []
  }
  const isAdmin = me === group.adminMemberId
  if (match.canceled) {
    return isAdmin || match.canceled.by === me ? ['restore'] : []
  }
  return isAdmin || match.createdBy === me || isPending(match) ? ['cancel'] : []
}
