import { ApiError } from '../../lib/api'
import { loadMatches, saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { registerGroup, sendMatch } from './groupsApi'
import { loadGroups, setGroupInviteCode } from './groupsStorage'
import type { Group } from './types'

// Una partida de grupo está pendiente hasta que el servidor la confirma.
export function isPending(match: Match): boolean {
  return match.type === 'group' && match.groupId !== null && !match.syncedAt
}

// Sin conexión, sin sesión (401) o con el servidor caído conviene parar y
// reintentar más tarde.
// Un rechazo de la API (4xx) afecta solo a esa partida o a ese grupo.
function shouldStop(error: unknown): boolean {
  return (
    !(error instanceof ApiError) || error.status === 401 || error.status >= 500
  )
}

async function inviteCodeOf(group: Group): Promise<string> {
  if (group.inviteCode) {
    return group.inviteCode
  }
  const inviteCode = await registerGroup(group)
  await setGroupInviteCode(group.id, inviteCode)
  return inviteCode
}

// Envía las partidas pendientes, de a una y en orden. Devuelve cuántas llegaron.
async function syncOnce(): Promise<number> {
  const pending = (await loadMatches())
    .filter(isPending)
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  if (pending.length === 0) {
    return 0
  }
  const groups = await loadGroups()
  let sent = 0
  for (const groupId of new Set(pending.map((match) => match.groupId))) {
    const group = groups.find((item) => item.id === groupId)
    if (!group) {
      continue
    }
    try {
      const inviteCode = await inviteCodeOf(group)
      for (const match of pending.filter((item) => item.groupId === groupId)) {
        try {
          await sendMatch(inviteCode, match)
          await saveMatch({ ...match, syncedAt: new Date().toISOString() })
          sent += 1
        } catch (error) {
          if (shouldStop(error)) {
            throw error
          }
        }
      }
    } catch (error) {
      if (shouldStop(error)) {
        return sent
      }
    }
  }
  return sent
}

let running: Promise<number> | null = null
let runAgain = false

// Nunca falla: lo que no se pudo enviar queda pendiente para el próximo intento.
// Si ya hay un envío en curso, pide una vuelta más para no perder partidas
// guardadas mientras tanto.
export function syncPendingMatches(): Promise<number> {
  if (running) {
    runAgain = true
    return running
  }
  running = (async () => {
    let total = 0
    try {
      do {
        runAgain = false
        total += await syncOnce()
      } while (runAgain)
    } catch {
      // Se reintentará cuando vuelva la conexión.
    }
    return total
  })().finally(() => {
    running = null
  })
  return running
}
