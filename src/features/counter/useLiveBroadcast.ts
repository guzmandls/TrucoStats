import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken } from '../../lib/session'
import { loadGroups } from '../groups/groupsStorage'
import { newMemberId } from '../groups/groupAdmin'
import { publishLive, stopLive, type LiveState } from '../groups/liveApi'
import { endLive } from '../groups/liveEnd'
import type { CounterController } from './useCounter'

const DEBOUNCE_MS = 400
// Mientras el contador está abierto se vuelve a publicar cada tanto, para que
// quien mira siga viendo la partida (y el tiempo) aunque no cambien los puntos.
const HEARTBEAT_MS = 20_000

export interface LiveBroadcast {
  // La partida terminó o se canceló: avisa a quienes la miran. Después de esto
  // el contador ya no la publica como en juego.
  end: (status: 'finished' | 'canceled', reason?: string) => void
}

// Publica en el servidor cómo va una partida de grupo, para que los demás
// integrantes puedan mirarla desde su celular. No hace nada en la partida
// rápida, sin sesión, sin conexión o si el grupo todavía no está en el
// servidor: el contador sigue funcionando igual.
//
// Cerrar el contador no termina la partida: sigue en vivo, igual que la partida
// guardada en el celular, hasta que termine o se cancele. Al salir se publica
// una última vez el estado exacto; si en un minuto nadie la actualiza, quienes
// miran la ven pausada (igual que el cronómetro del contador).
export function useLiveBroadcast(counter: CounterController): LiveBroadcast {
  const { context } = counter
  const groupId = context.type === 'group' ? context.groupId : null
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  // Cada partida tiene su id; si es una partida vieja que no lo tiene, se crea uno
  // para esta sesión del contador.
  const [fallbackId] = useState(() => newMemberId())
  const liveId = context.liveId ?? fallbackId
  // Partida que ya se terminó o canceló desde acá: no se vuelve a publicar.
  const endedId = useRef<string | null>(null)

  useEffect(() => {
    if (!groupId) {
      return
    }
    let active = true
    void loadGroups().then((groups) => {
      if (active) {
        setInviteCode(
          groups.find((group) => group.id === groupId)?.inviteCode ?? null,
        )
      }
    })
    return () => {
      active = false
    }
  }, [groupId])

  const nos = counter.points('nos')
  const ellos = counter.points('ellos')
  const latest = useRef<LiveState | null>(null)
  useEffect(() => {
    latest.current = {
      teams: context.teams,
      target: counter.target,
      scores: { nos, ellos },
      paused: counter.paused,
      elapsedSeconds: counter.elapsed,
      winner: counter.winner,
    }
  })

  const enabled = inviteCode !== null && getToken() !== null

  const publishNow = useCallback(
    (keepalive: boolean) => {
      if (!inviteCode || !latest.current || endedId.current === liveId) {
        return
      }
      void publishLive(inviteCode, liveId, latest.current, {
        keepalive,
      }).catch(() => undefined)
    },
    [inviteCode, liveId],
  )

  // Cada cambio de la partida se publica enseguida (con una pequeña espera para
  // juntar varios toques seguidos).
  useEffect(() => {
    if (!enabled) {
      return
    }
    const timeout = window.setTimeout(() => publishNow(false), DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [
    enabled,
    publishNow,
    nos,
    ellos,
    counter.target,
    counter.paused,
    counter.winner,
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const interval = window.setInterval(() => publishNow(false), HEARTBEAT_MS)
    return () => window.clearInterval(interval)
  }, [enabled, publishNow])

  // Al dejar de ver la pantalla (otra app, bloqueo, cerrar la pestaña) se publica
  // el estado exacto de ese momento, porque después el navegador puede frenar
  // la página.
  useEffect(() => {
    if (!enabled) {
      return
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        publishNow(true)
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onHidden)
    }
  }, [enabled, publishNow])

  // Al salir del contador: si ya hay puntos la partida sigue en vivo (se publica
  // el estado final); si no se jugó nada, se borra para no dejar una partida 0-0.
  useEffect(() => {
    if (!enabled || !inviteCode) {
      return
    }
    return () => {
      if (endedId.current === liveId) {
        return
      }
      const last = latest.current
      if (last && last.scores.nos + last.scores.ellos > 0) {
        void publishLive(inviteCode, liveId, last, { keepalive: true }).catch(
          () => undefined,
        )
      } else {
        void stopLive(inviteCode, liveId).catch(() => undefined)
      }
    }
  }, [enabled, inviteCode, liveId])

  const end = useCallback(
    (status: 'finished' | 'canceled', reason?: string) => {
      if (!inviteCode || !latest.current || !getToken()) {
        return
      }
      endedId.current = liveId
      void endLive({
        inviteCode,
        liveId,
        state: latest.current,
        status,
        reason,
      })
    },
    [inviteCode, liveId],
  )

  return { end }
}
