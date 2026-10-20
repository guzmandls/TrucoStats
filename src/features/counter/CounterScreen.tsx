import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BackIcon,
  GroupPlusIcon,
  PauseIcon,
  PersonIcon,
  PlayIcon,
  UndoIcon,
} from '../../components/Icons'
import {
  ConfirmDialog,
  HeaderIconButton,
  HeaderMenu,
  PageHeader,
} from '../../components/ui'
import { HoldButton } from '../../components/HoldButton'
import { Counter } from './Counter'
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

      {counter.paused && (
        <div className={styles.pauseOverlay} role="status">
          <div className={styles.pauseCard}>
            <PauseIcon size={28} />
            <p className={styles.pauseText}>Partida pausada</p>
            <button
              type="button"
              className={styles.pauseResume}
              onClick={counter.togglePause}
            >
              Reanudar
            </button>
          </div>
        </div>
      )}

      {counter.awaitingConfirmation && winner && (
        <ConfirmDialog
          title={`¿El equipo ganador es “${TEAM_LABELS[winner]}”?`}
          onConfirm={() => {
            const destination =
              counter.context.type === 'group' && counter.context.groupId
                ? `/grupo/${counter.context.groupId}`
                : '/'
            counter.confirm()
            navigate(destination)
          }}
          onCancel={counter.decline}
        />
      )}

      <BottomBar
        counter={counter}
        locked={counter.awaitingConfirmation || counter.paused}
      />
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
