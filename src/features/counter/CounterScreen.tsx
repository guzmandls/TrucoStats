import { useEffect, useRef } from 'react'
import { HoldButton } from '../../components/HoldButton'
import { Counter } from './Counter'
import type { Team } from './counterLogic'
import { MAX_TARGET, MIN_TARGET, TARGET_STEP, useCounter } from './useCounter'
import styles from './CounterScreen.module.css'

const TEAM_LABELS: Record<Team, string> = {
  nos: 'Nosotros',
  ellos: 'Ellos',
}

export function CounterScreen() {
  const counter = useCounter()
  const drawingRef = useRef<HTMLDivElement>(null)

  const nosPoints = counter.points('nos')
  const ellosPoints = counter.points('ellos')
  const winner = counter.winner
  const awaitingConfirmation = winner !== null && !counter.finished

  useEffect(() => {
    const element = drawingRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [nosPoints, ellosPoints])

  return (
    <div className={styles.screen}>
      <TopBar
        target={counter.target}
        started={counter.started}
        onChange={counter.setTarget}
        nos={nosPoints}
        ellos={ellosPoints}
      />

      <Counter counter={counter} drawingRef={drawingRef} />

      {awaitingConfirmation && (
        <VictoryBanner
          label={TEAM_LABELS[winner]}
          onConfirm={counter.confirm}
          onDecline={() => counter.undoTeam(winner)}
        />
      )}

      <BottomBar
        counter={counter}
        disabled={counter.finished}
        locked={awaitingConfirmation}
      />

      {counter.finished && winner && (
        <FinishedOverlay
          label={TEAM_LABELS[winner]}
          nos={nosPoints}
          ellos={ellosPoints}
          onNewGame={counter.reset}
        />
      )}
    </div>
  )
}

interface TopBarProps {
  target: number
  started: boolean
  onChange: (target: number) => void
  nos: number
  ellos: number
}

function TopBar({ target, started, onChange, nos, ellos }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.namesRow}>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>Nosotros</h2>
          <span className={styles.score} data-testid="score-nos">
            {nos}
          </span>
        </div>
        <div className={styles.teamHead}>
          <h2 className={styles.name}>Ellos</h2>
          <span className={styles.score} data-testid="score-ellos">
            {ellos}
          </span>
        </div>
      </div>

      {!started && (
        <div className={styles.targetRow}>
          <span className={styles.targetLabel}>Objetivo</span>
          <div className={styles.targetControls}>
            <button
              type="button"
              className={styles.step}
              onClick={() => onChange(target - TARGET_STEP)}
              disabled={target <= MIN_TARGET}
              aria-label="Bajar objetivo"
            >
              −
            </button>
            <span className={styles.targetValue}>{target}</span>
            <button
              type="button"
              className={styles.step}
              onClick={() => onChange(target + TARGET_STEP)}
              disabled={target >= MAX_TARGET}
              aria-label="Subir objetivo"
            >
              +
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

interface BottomBarProps {
  counter: ReturnType<typeof useCounter>
  disabled: boolean
  locked: boolean
}

function BottomBar({ counter, disabled, locked }: BottomBarProps) {
  return (
    <footer className={styles.bottomBar}>
      <button
        type="button"
        className={styles.undo}
        onClick={() => counter.undoTeam('nos')}
        disabled={!counter.canUndo('nos') || disabled}
        aria-label="Deshacer Nosotros"
      >
        ↶
      </button>

      <div className={styles.pill}>
        <HoldButton
          className={styles.pillButton}
          onStart={() => counter.startIncrement('nos')}
          onEnd={counter.finishIncrement}
          disabled={counter.hasReached('nos') || disabled || locked}
        >
          N
        </HoldButton>
        <HoldButton
          className={styles.pillButton}
          onStart={() => counter.startIncrement('ellos')}
          onEnd={counter.finishIncrement}
          disabled={counter.hasReached('ellos') || disabled || locked}
        >
          E
        </HoldButton>
      </div>

      <button
        type="button"
        className={styles.undo}
        onClick={() => counter.undoTeam('ellos')}
        disabled={!counter.canUndo('ellos') || disabled}
        aria-label="Deshacer Ellos"
      >
        ↶
      </button>
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

interface FinishedOverlayProps {
  label: string
  nos: number
  ellos: number
  onNewGame: () => void
}

function FinishedOverlay({
  label,
  nos,
  ellos,
  onNewGame,
}: FinishedOverlayProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>¡Ganó {label}!</h2>
        <p className={styles.cardScore}>
          Nosotros {nos} — {ellos} Ellos
        </p>
        <button type="button" className={styles.newGame} onClick={onNewGame}>
          Nueva partida
        </button>
      </div>
    </div>
  )
}
