import { useEffect, useState } from 'react'
import { Dialog, EmptyNote } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { whenLabel } from '../matches/groupOverview'
import { fetchMatchHistory, type MatchEvent } from './groupsApi'
import styles from './MatchHistoryDialog.module.css'

const ACTION_LABELS: Record<MatchEvent['action'], string> = {
  register: 'Registrada',
  cancel: 'Cancelada',
  restore: 'Restaurada',
}

interface MatchHistoryDialogProps {
  inviteCode: string
  matchId: string
  onClose: () => void
}

// Lista todo lo que pasó con una partida: cuándo se registró y cada
// cancelación o restauración (quién, cuándo y el motivo). Se pide al servidor.
export function MatchHistoryDialog({
  inviteCode,
  matchId,
  onClose,
}: MatchHistoryDialogProps) {
  const [events, setEvents] = useState<MatchEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMatchHistory(inviteCode, matchId)
      .then((result) => {
        if (active) {
          setEvents(result)
        }
      })
      .catch((failure) => {
        if (active) {
          setError(
            failure instanceof ApiError
              ? failure.message
              : 'Necesitas conexión a Internet para ver el historial.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [inviteCode, matchId])

  return (
    <Dialog title="Historial de la partida" onClose={onClose} closeButton>
      {error && <EmptyNote>{error}</EmptyNote>}
      {!error && events === null && <EmptyNote>Cargando…</EmptyNote>}
      {events && (
        <ol className={styles.list}>
          {events.map((event, index) => (
            <li key={index} className={styles.event}>
              <span className={styles.action}>
                {ACTION_LABELS[event.action]}
              </span>
              <span className={styles.meta}>
                {event.by ? `${event.by} · ` : ''}
                {whenLabel(event.at)}
              </span>
              {event.reason && (
                <span className={styles.reason}>Motivo: {event.reason}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  )
}
