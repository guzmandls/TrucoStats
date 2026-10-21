import { useEffect, useRef, useState } from 'react'
import { getToken } from '../../lib/session'
import { loadGroups } from '../groups/groupsStorage'
import { newMemberId } from '../groups/groupAdmin'
import { publishLive, stopLive, type LiveState } from '../groups/liveApi'
import type { CounterController } from './useCounter'

const DEBOUNCE_MS = 400
// Mientras el contador está abierto se vuelve a publicar cada tanto, para que
// quien mira siga viendo la partida (y el tiempo) aunque no cambien los puntos.
const HEARTBEAT_MS = 20_000

// Publica en el servidor cómo va una partida de grupo, para que los demás
// integrantes puedan mirarla desde su celular. No hace nada en la partida
// rápida, sin sesión, sin conexión o si el grupo todavía no está en el
// servidor: el contador sigue funcionando igual. Al salir del contador, la
// partida en vivo se borra.
export function useLiveBroadcast(counter: CounterController): void {
  const { context } = counter
  const groupId = context.type === 'group' ? context.groupId : null
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  // Cada partida tiene su id; si es una partida vieja que no lo tiene, se crea uno
  // para esta sesión del contador.
  const [fallbackId] = useState(() => newMemberId())
  const liveId = context.liveId ?? fallbackId

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

  // Cada cambio de la partida se publica enseguida (con una pequeña espera para
  // juntar varios toques seguidos).
  useEffect(() => {
    if (!enabled || !inviteCode) {
      return
    }
    const timeout = window.setTimeout(() => {
      if (latest.current) {
        void publishLive(inviteCode, liveId, latest.current).catch(
          () => undefined,
        )
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [
    enabled,
    inviteCode,
    liveId,
    nos,
    ellos,
    counter.target,
    counter.paused,
    counter.winner,
  ])

  useEffect(() => {
    if (!enabled || !inviteCode) {
      return
    }
    const interval = window.setInterval(() => {
      if (latest.current) {
        void publishLive(inviteCode, liveId, latest.current).catch(
          () => undefined,
        )
      }
    }, HEARTBEAT_MS)
    return () => window.clearInterval(interval)
  }, [enabled, inviteCode, liveId])

  useEffect(() => {
    if (!enabled || !inviteCode) {
      return
    }
    return () => {
      void stopLive(inviteCode, liveId).catch(() => undefined)
    }
  }, [enabled, inviteCode, liveId])
}
