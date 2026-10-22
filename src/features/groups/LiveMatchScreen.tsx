import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon, PauseIcon } from '../../components/Icons'
import {
  Button,
  ButtonLink,
  Dialog,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
} from '../../components/ui'
import { Counter } from '../counter/Counter'
import { AWAY_LIMIT_MS, formatClock } from '../counter/gameTimer'
import counterStyles from '../counter/CounterScreen.module.css'
import { participantNames } from '../matches/format'
import type { LiveMatch } from './liveApi'
import { useGroup } from './useGroup'
import { useLiveMatch } from './useLiveMatch'
import styles from './LiveMatchScreen.module.css'

const POLL_MS = 3000

// Mirar desde otro celular la partida de grupo que se está contando: los
// mismos puntos y el mismo dibujo que ve quien cuenta, sin poder tocar nada. Se
// actualiza sola cada pocos segundos (necesita conexión).
// Equipo que ganó una partida terminada (el que llegó al objetivo al terminar).
function winnerOf(live: LiveMatch): 'nos' | 'ellos' | null {
  if (live.state.winner) {
    return live.state.winner
  }
  const { nos, ellos } = live.state.scores
  return nos === ellos ? null : nos > ellos ? 'nos' : 'ellos'
}

export function LiveMatchScreen() {
  const { id, liveId } = useParams<{ id: string; liveId: string }>()
  const navigate = useNavigate()
  const { group } = useGroup(id)
  const { lives, receivedAt, loaded } = useLiveMatch(group, POLL_MS)
  // Esta partida en particular (puede haber varias en vivo a la vez).
  const live = lives.find((item) => item.id === liveId) ?? null
  const drawingRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())
  // Para poder cerrar el cartel de final y seguir viendo el marcador.
  const [noticeClosed, setNoticeClosed] = useState(false)

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
  const ended = live.status !== 'live'
  // Si el contador se cerró, el servidor deja de recibir novedades; igual que el
  // cronómetro del contador, pasado un minuto sin novedades la partida figura
  // pausada (y el tiempo se detiene ahí).
  const silentSeconds =
    live.ageSeconds + Math.max(0, Math.floor((now - receivedAt) / 1000))
  const away = !ended && !state.paused && silentSeconds > AWAY_LIMIT_MS / 1000
  const paused = state.paused || away
  const elapsed =
    state.elapsedSeconds +
    (state.paused || ended ? 0 : Math.min(silentSeconds, AWAY_LIMIT_MS / 1000))
  const teamName = (side: 'nos' | 'ellos') =>
    participantNames(state.teams[side]) ??
    (side === 'nos' ? 'Nosotros' : 'Ellos')

  return (
    <div className={counterStyles.screen}>
      {header(
        <span className={styles.clock}>
          {paused && !ended && <PauseIcon size={20} />}
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
        {live.status === 'canceled'
          ? 'Partida cancelada'
          : live.status === 'finished'
            ? `Terminó${winnerOf(live) ? ` · Ganó ${teamName(winnerOf(live)!)}` : ''}`
            : state.winner
              ? `Ganó ${teamName(state.winner)}`
              : paused
                ? 'Partida pausada'
                : `Mirando en vivo · a ${state.target}`}
      </footer>

      {ended && !noticeClosed && (
        <Dialog
          title={
            live.status === 'canceled'
              ? 'La partida fue cancelada'
              : 'La partida terminó'
          }
          onClose={() => setNoticeClosed(true)}
          closeButton
        >
          <p>
            {live.status === 'canceled'
              ? live.reason
                ? `Motivo: ${live.reason}`
                : 'Quedó cancelada en el historial.'
              : `${winnerOf(live) ? `Ganó ${teamName(winnerOf(live)!)}` : 'Terminó'}, ${nos} a ${ellos}.`}
          </p>
          <Button onClick={back}>
            {live.status === 'canceled'
              ? 'Volver al grupo'
              : 'Ver en el historial'}
          </Button>
        </Dialog>
      )}
    </div>
  )
}
