import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BackIcon,
  CloseIcon,
  GroupPlusIcon,
  PauseIcon,
  PersonIcon,
  PlayIcon,
  ShareIcon,
  UndoIcon,
} from '../../components/Icons'
import {
  Button,
  ConfirmDialog,
  Dialog,
  HeaderIconButton,
  HeaderMenu,
  PageHeader,
  TextInput,
} from '../../components/ui'
import { HoldButton } from '../../components/HoldButton'
import { isRegistered, useSession } from '../../lib/session'
import { Counter } from './Counter'
import { ShareLiveDialog } from './ShareLiveDialog'
import { useLiveBroadcast } from './useLiveBroadcast'
import { quickContext, type GameContext } from './gameContext'
import { formatClock } from './gameTimer'
import {
  DEFAULT_TARGET,
  MAX_TARGET,
  TARGET_STEP,
  useCounter,
  type CounterController,
} from './useCounter'
import styles from './CounterScreen.module.css'

// Id secreto para mirar la partida compartida: difícil de adivinar, porque es
// lo único que da acceso.
function newShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

const TEAM_LABELS: Record<'nos' | 'ellos', string> = {
  nos: 'Nosotros',
  ellos: 'Ellos',
}

interface CounterLocationState {
  gameContext?: GameContext
  target?: number
}

export function CounterScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const nav = location.state as CounterLocationState | null
  const initialContext = useMemo(
    () => nav?.gameContext ?? quickContext(),
    [nav],
  )
  const counter = useCounter(nav?.target ?? DEFAULT_TARGET, initialContext)
  const drawingRef = useRef<HTMLDivElement>(null)
  const live = useLiveBroadcast(counter)
  const [canceling, setCanceling] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const session = useSession()
  const canShare = isRegistered(session)
  const inGroup = counter.context.type === 'group' && !!counter.context.groupId
  const groupHome = inGroup ? `/grupo/${counter.context.groupId}` : '/'
  const isQuick = counter.context.type === 'quick'

  const openShare = () => {
    if (canShare && !counter.context.shareId) {
      counter.share(newShareId())
    }
    setSharing(true)
  }

  const nosPoints = counter.points('nos')
  const ellosPoints = counter.points('ellos')
  const winner = counter.winner

  const handleBack = () => {
    if (
      typeof window.history.state?.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    const element = drawingRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [nosPoints, ellosPoints])

  return (
    <div className={styles.screen}>
      <PageHeader
        center={<TimerButton counter={counter} />}
        leading={
          <HeaderIconButton label="Volver" onClick={handleBack}>
            <BackIcon />
          </HeaderIconButton>
        }
        trailing={
          <HeaderMenu
            label="Menú"
            items={[
              ...(counter.started
                ? [
                    {
                      label: 'Cancelar partida',
                      icon: <CloseIcon />,
                      onClick: () => setCanceling(true),
                    },
                  ]
                : []),
              ...(isQuick
                ? [
                    {
                      label: 'Compartir en vivo',
                      icon: <ShareIcon />,
                      onClick: openShare,
                    },
                  ]
                : []),
              {
                label: 'Crear grupo',
                to: '/crear-grupo',
                icon: <GroupPlusIcon />,
              },
              { label: 'Ver perfil', to: '/perfil', icon: <PersonIcon /> },
            ]}
            extra={<TargetRow counter={counter} />}
          />
        }
      />

      <div className={styles.namesRow}>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>{TEAM_LABELS.nos}</h2>
          <span className={styles.score} data-testid="score-nos">
            {nosPoints}
          </span>
        </div>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>{TEAM_LABELS.ellos}</h2>
          <span className={styles.score} data-testid="score-ellos">
            {ellosPoints}
          </span>
        </div>
      </div>

      <Counter counter={counter} drawingRef={drawingRef} />

      {counter.awaitingConfirmation && winner && (
        <ConfirmDialog
          title={`¿El equipo ganador es “${TEAM_LABELS[winner]}”?`}
          onConfirm={() => {
            live.end('finished')
            counter.confirm()
            navigate(groupHome)
          }}
          onCancel={counter.decline}
        />
      )}

      {canceling && (
        <Dialog
          title="¿Cancelar la partida?"
          onClose={() => setCanceling(false)}
          closeButton
        >
          <p>
            {inGroup
              ? 'Quedará cancelada en el historial.'
              : 'Se borrará el marcador.'}
          </p>
          {inGroup && (
            <TextInput
              aria-label="Motivo (opcional)"
              placeholder="Motivo (opcional)"
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true)
              live.end('canceled', reason.trim())
              void counter.cancelGame(reason).then(() => navigate(groupHome))
            }}
          >
            Cancelar partida
          </Button>
          <Button variant="secondary" onClick={() => setCanceling(false)}>
            Seguir jugando
          </Button>
        </Dialog>
      )}

      {sharing && (
        <ShareLiveDialog
          shareId={canShare ? (counter.context.shareId ?? null) : null}
          onClose={() => setSharing(false)}
        />
      )}

      <BottomBar counter={counter} locked={counter.awaitingConfirmation} />
    </div>
  )
}

function TimerButton({ counter }: { counter: CounterController }) {
  return (
    <button
      type="button"
      className={styles.timer}
      onClick={counter.togglePause}
      aria-label={counter.paused ? 'Reanudar partida' : 'Pausar partida'}
      aria-pressed={counter.paused}
    >
      {counter.paused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
      <span className={styles.timerValue} data-testid="timer-value">
        {formatClock(counter.elapsed)}
      </span>
    </button>
  )
}

function TargetRow({ counter }: { counter: CounterController }) {
  return (
    <div className={styles.targetRow}>
      <span className={styles.targetLabel}>Puntuación máxima</span>
      <div className={styles.targetControls}>
        <button
          type="button"
          className={styles.targetStep}
          onClick={() => counter.setTarget(counter.target - TARGET_STEP)}
          disabled={counter.target <= counter.minTarget}
          aria-label="Bajar puntuación máxima"
        >
          −
        </button>
        <span className={styles.targetValue} data-testid="objective-value">
          {counter.target}
        </span>
        <button
          type="button"
          className={styles.targetStep}
          onClick={() => counter.setTarget(counter.target + TARGET_STEP)}
          disabled={counter.target >= MAX_TARGET}
          aria-label="Subir puntuación máxima"
        >
          +
        </button>
      </div>
    </div>
  )
}

interface BottomBarProps {
  counter: ReturnType<typeof useCounter>
  locked: boolean
}

function BottomBar({ counter, locked }: BottomBarProps) {
  return (
    <footer className={styles.bottomBar}>
      <HoldButton
        className={styles.undo}
        ariaLabel={`Deshacer ${TEAM_LABELS.nos}`}
        onStart={() => counter.undoTeam('nos')}
        onEnd={() => undefined}
        disabled={!counter.canUndo('nos')}
      >
        <UndoIcon />
      </HoldButton>

      <div className={styles.pill}>
        <HoldButton
          className={styles.pillButton}
          onStart={() => counter.startIncrement('nos')}
          onEnd={counter.finishIncrement}
          disabled={counter.hasReached('nos') || locked}
        >
          N
        </HoldButton>
        <HoldButton
          className={styles.pillButton}
          onStart={() => counter.startIncrement('ellos')}
          onEnd={counter.finishIncrement}
          disabled={counter.hasReached('ellos') || locked}
        >
          E
        </HoldButton>
      </div>

      <HoldButton
        className={styles.undo}
        ariaLabel={`Deshacer ${TEAM_LABELS.ellos}`}
        onStart={() => counter.undoTeam('ellos')}
        onEnd={() => undefined}
        disabled={!counter.canUndo('ellos')}
      >
        <UndoIcon />
      </HoldButton>
    </footer>
  )
}
