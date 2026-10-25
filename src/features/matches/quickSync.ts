import { apiRequest, deleteRequest } from '../../lib/api'
import { getSession, isRegistered } from '../../lib/session'
import { deleteMatch, loadMatches, saveMatch } from './matchesStorage'
import type { Match } from './types'

// Las partidas rápidas se guardan primero en el celular y, con una cuenta
// iniciada, también en la cuenta: así se ven desde cualquier celular y cuentan
// para las estadísticas personales que ven los demás. Una partida rápida
// jugada sin cuenta se sube a la cuenta con la que se inicie sesión después.

// Partidas eliminadas sin conexión: se borran del servidor en cuanto se pueda.
const PENDING_DELETES_KEY = 'trucostats.pendingQuickDeletes'

function pendingDeletes(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(PENDING_DELETES_KEY) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function savePendingDeletes(ids: string[]): void {
  try {
    if (ids.length === 0) {
      localStorage.removeItem(PENDING_DELETES_KEY)
    } else {
      localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(ids))
    }
  } catch {
    // Sin almacenamiento no se puede recordar el borrado pendiente.
  }
}

function hasAccount(): boolean {
  return isRegistered(getSession())
}

export function isQuick(match: Match): boolean {
  return match.type === 'quick'
}

// Sube las partidas rápidas que todavía no están en la cuenta y borra del
// servidor las que se eliminaron sin conexión. Nunca falla: lo que no se pudo
// queda para la próxima vez.
export async function syncQuickMatches(): Promise<void> {
  if (!hasAccount()) {
    return
  }
  try {
    const left: string[] = []
    for (const id of pendingDeletes()) {
      try {
        await deleteRequest(`/api/partidas-rapidas/${encodeURIComponent(id)}`)
      } catch {
        left.push(id)
      }
    }
    savePendingDeletes(left)

    const unsent = (await loadMatches()).filter(
      (match) => isQuick(match) && !match.syncedAt,
    )
    for (const match of unsent) {
      await apiRequest('/api/partidas-rapidas', {
        method: 'POST',
        body: JSON.stringify(match),
      })
      await saveMatch({ ...match, syncedAt: new Date().toISOString() })
    }
  } catch {
    // Sin conexión: se reintenta en la próxima sincronización.
  }
}

// Trae las partidas rápidas de la cuenta (las de otros celulares) y quita del
// celular las que ya se eliminaron desde otro. Las que todavía no se subieron
// se conservan.
export async function pullQuickMatches(): Promise<void> {
  if (!hasAccount()) {
    return
  }
  try {
    const { matches } = await apiRequest<{ matches: Match[] }>(
      '/api/partidas-rapidas',
    )
    const deleted = new Set(pendingDeletes())
    const remote = new Map(matches.map((match) => [match.id, match]))
    const local = (await loadMatches()).filter(isQuick)
    for (const match of local) {
      if (match.syncedAt && !remote.has(match.id)) {
        await deleteMatch(match.id)
      }
    }
    const known = new Set(local.map((match) => match.id))
    for (const match of matches) {
      if (!known.has(match.id) && !deleted.has(match.id)) {
        await saveMatch({ ...match, syncedAt: new Date().toISOString() })
      }
    }
  } catch {
    // Sin conexión se muestran las del celular.
  }
}

// Elimina del todo una partida rápida: del celular enseguida y de la cuenta
// en cuanto haya conexión.
export async function removeQuickMatch(match: Match): Promise<void> {
  await deleteMatch(match.id)
  if (!match.syncedAt) {
    return
  }
  try {
    await deleteRequest(`/api/partidas-rapidas/${encodeURIComponent(match.id)}`)
  } catch {
    savePendingDeletes([...pendingDeletes(), match.id])
  }
}

// Al cerrar sesión, las partidas rápidas que ya están en la cuenta se quitan
// del celular (son de esa cuenta). Las que no se subieron se conservan.
export async function clearAccountQuickMatches(): Promise<void> {
  for (const match of await loadMatches()) {
    if (isQuick(match) && match.syncedAt) {
      await deleteMatch(match.id)
    }
  }
  savePendingDeletes([])
}
