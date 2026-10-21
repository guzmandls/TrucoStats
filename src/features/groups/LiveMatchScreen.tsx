import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon, PauseIcon } from '../../components/Icons'
import {
  ButtonLink,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
} from '../../components/ui'
import { Counter } from '../counter/Counter'
import { formatClock } from '../counter/gameTimer'
import counterStyles from '../counter/CounterScreen.module.css'
import { participantNames } from '../matches/format'
import { useGroup } from './useGroup'
import { useLiveMatch } from './useLiveMatch'
import styles from './LiveMatchScreen.module.css'

const POLL_MS = 3000

// Mirar desde otro celular la partida de grupo que se está contando: los
// mismos puntos y el mismo dibujo que ve quien cuenta, sin poder tocar nada. Se
// actualiza sola cada pocos segundos (necesita conexión).
export function LiveMatchScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group } = useGroup(id)
  const { live, receivedAt, loaded } = useLiveMatch(group, POLL_MS)
  const drawingRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const nos = live?.state.scores.nos ?? 0
  const ellos = live?.state.scores.ellos ?? 0
  useEffect(() => {
    const element = drawingRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [nos, ellos])

  const back = () => navigate(`/grupo/${id}`)
  const header = (center?: React.ReactNode) => (
    <PageHeader
      title={center ? undefined : 'En vivo'}
      center={center}
      leading={
        <HeaderIconButton label="Volver" onClick={back}>
          <BackIcon />
        </HeaderIconButton>
      }
    />
  )

  if (!group || !loaded) {
    return (
      <div className={counterStyles.screen}>
        {header()}
        <EmptyNote>Buscando la partida…</EmptyNote>
      </div>
    )
  }

  if (!live) {
    return (
      <div className={counterStyles.screen}>
        {header()}
        <EmptyNote>La partida terminó.</EmptyNote>
        <div className={styles.back}>
          <ButtonLink to={`/grupo/${group.id}`}>Volver al grupo</ButtonLink>
        </div>
      </div>
    )
  }

  const { state } = live
  const elapsed =
    state.elapsedSeconds +
    (state.paused ? 0 : Math.max(0, Math.floor((now - receivedAt) / 1000)))
  const teamName = (side: 'nos' | 'ellos') =>
    participantNames(state.teams[side]) ??
    (side === 'nos' ? 'Nosotros' : 'Ellos')

  return (
    <div className={counterStyles.screen}>
      {header(
        <span className={styles.clock}>
          {state.paused && <PauseIcon size={20} />}
          <span data-testid="live-timer">{formatClock(elapsed)}</span>
        </span>,
      )}

      <div className={counterStyles.namesRow}>
        <div className={counterStyles.teamHead}>
          <h2 className={counterStyles.name}>{teamName('nos')}</h2>
          <span className={counterStyles.score} data-testid="live-score-nos">
            {nos}
          </span>
        </div>
        <div className={counterStyles.teamHead}>
          <h2 className={counterStyles.name}>{teamName('ellos')}</h2>
          <span className={counterStyles.score} data-testid="live-score-ellos">
            {ellos}
          </span>
        </div>
      </div>

      <Counter
        counter={{
          target: state.target,
          started: nos + ellos > 0,
          points: (side) => state.scores[side],
        }}
        drawingRef={drawingRef}
      />

      <footer className={styles.status} role="status">
        {state.winner
          ? `Ganó ${teamName(state.winner)}`
          : state.paused
            ? 'Partida pausada'
            : `Mirando en vivo · a ${state.target}`}
      </footer>
    </div>
  )
}
