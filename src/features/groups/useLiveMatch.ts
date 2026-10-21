import { useEffect, useState } from 'react'
import { getToken } from '../../lib/session'
import { fetchLive, type LiveMatch } from './liveApi'
import type { Group } from './types'

export interface LiveView {
  live: LiveMatch | null
  // Cuándo (ms) llegó esta versión al celular: sirve para seguir contando el
  // tiempo entre una consulta y la siguiente.
  receivedAt: number
  // Si ya se hizo al menos una consulta con respuesta.
  loaded: boolean
}

// Consulta cada tanto si hay una partida en vivo en el grupo. Solo con sesión,
// con el grupo en el servidor y con la pantalla visible. Sin conexión se
// mantiene lo último que se vio.
export function useLiveMatch(
  group: Group | null,
  intervalMs: number,
  enabled = true,
): LiveView {
  const [view, setView] = useState<LiveView>({
    live: null,
    receivedAt: 0,
    loaded: false,
  })
  const inviteCode = group?.inviteCode
  const isMember = group?.myMemberId !== undefined

  useEffect(() => {
    if (!enabled || !inviteCode || !isMember || !getToken()) {
      return
    }
    let active = true
    const poll = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      fetchLive(inviteCode)
        .then((live) => {
          if (active) {
            setView({ live, receivedAt: Date.now(), loaded: true })
          }
        })
        .catch(() => undefined)
    }
    poll()
    const interval = window.setInterval(poll, intervalMs)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [enabled, inviteCode, isMember, intervalMs])

  return view
}
