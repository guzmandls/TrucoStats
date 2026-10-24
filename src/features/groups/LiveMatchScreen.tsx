import { useNavigate, useParams } from 'react-router-dom'
import { ButtonLink, EmptyNote } from '../../components/ui'
import { LiveMatchView } from './LiveMatchView'
import { useGroup } from './useGroup'
import { useLiveMatch } from './useLiveMatch'
import styles from './LiveMatchScreen.module.css'

const POLL_MS = 3000

// Mirar desde otro celular la partida de grupo que se está contando. Se
// actualiza sola cada pocos segundos (necesita conexión).
export function LiveMatchScreen() {
  const { id, liveId } = useParams<{ id: string; liveId: string }>()
  const navigate = useNavigate()
  const { group } = useGroup(id)
  const { lives, receivedAt, loaded } = useLiveMatch(group, POLL_MS)
  // Esta partida en particular (puede haber varias en vivo a la vez).
  const live = lives.find((item) => item.id === liveId) ?? null

  return (
    <LiveMatchView
      live={live}
      loaded={!!group && loaded}
      receivedAt={receivedAt}
      onBack={() => navigate(`/grupo/${id}`)}
      missing={
        <>
          <EmptyNote>La partida terminó.</EmptyNote>
          <div className={styles.back}>
            <ButtonLink to={`/grupo/${id}`}>Volver al grupo</ButtonLink>
          </div>
        </>
      }
      finishedAction="Ver en el historial"
      canceledNote="Quedó cancelada en el historial."
      canceledAction="Volver al grupo"
    />
  )
}
