import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { HoldButton } from '../../components/HoldButton'
import { Counter } from './Counter'
import { quickContext, type GameContext } from './gameContext'
import { DEFAULT_TARGET, useCounter } from './useCounter'
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

  useEffect(() => {
    const element = drawingRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [nosPoints, ellosPoints])

  return (
    <div className={styles.screen}>
      <TopBar nos={nosPoints} ellos={ellosPoints} />

      <Counter counter={counter} drawingRef={drawingRef} />

      {counter.awaitingConfirmation && winner && (
        <VictoryBanner
          label={TEAM_LABELS[winner]}
          onConfirm={counter.confirm}
          onDecline={counter.decline}
        />
      )}

      <BottomBar counter={counter} locked={counter.awaitingConfirmation} />
    </div>
  )
}

interface TopBarProps {
  nos: number
  ellos: number
}

function TopBar({ nos, ellos }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.namesRow}>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>{TEAM_LABELS.nos}</h2>
          <span className={styles.score} data-testid="score-nos">
            {nos}
          </span>
        </div>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>{TEAM_LABELS.ellos}</h2>
          <span className={styles.score} data-testid="score-ellos">
            {ellos}
          </span>
        </div>
      </div>
    </header>
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
        ↶
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
        ↶
      </HoldButton>
    </footer>
  )
}

interface VictoryBannerProps {
  label: string
  onConfirm: () => void
  onDecline: () => void
}

function VictoryBanner({ label, onConfirm, onDecline }: VictoryBannerProps) {
  return (
    <div className={styles.victory} role="alert">
      <span className={styles.victoryTitle}>Confirmar ganador</span>
      <span className={styles.victoryQuestion}>
        ¿El equipo ganador es “{label}”?
      </span>
      <div className={styles.victoryActions}>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          Sí
        </button>
        <button type="button" className={styles.decline} onClick={onDecline}>
          No
        </button>
      </div>
    </div>
  )
}
