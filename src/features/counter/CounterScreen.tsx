import { useEffect, useRef } from 'react'
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
  const leftMarksRef = useRef<HTMLDivElement>(null)
  const rightMarksRef = useRef<HTMLDivElement>(null)

  const nosPoints = counter.points('nos')
  const ellosPoints = counter.points('ellos')

  useEffect(() => {
    for (const element of [leftMarksRef.current, rightMarksRef.current]) {
      if (element) {
        element.scrollTop = element.scrollHeight
      }
    }
  }, [nosPoints, ellosPoints])

  return (
    <div className={styles.screen}>
      <TargetBar
        target={counter.target}
        locked={counter.started}
        onChange={counter.setTarget}
      />

      <Counter
        counter={counter}
        leftMarksRef={leftMarksRef}
        rightMarksRef={rightMarksRef}
        disabled={counter.finished}
      />

      {counter.winner && !counter.finished && (
        <VictoryBanner
          label={TEAM_LABELS[counter.winner]}
          target={counter.target}
          onConfirm={counter.confirm}
        />
      )}

      {counter.finished && counter.winner && (
        <FinishedOverlay
          label={TEAM_LABELS[counter.winner]}
          nos={nosPoints}
          ellos={ellosPoints}
          onNewGame={counter.reset}
        />
      )}
    </div>
  )
}

interface TargetBarProps {
  target: number
  locked: boolean
  onChange: (target: number) => void
}

function TargetBar({ target, locked, onChange }: TargetBarProps) {
  return (
    <header className={styles.targetBar}>
      <span className={styles.targetLabel}>Objetivo</span>
      <div className={styles.targetControls}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChange(target - TARGET_STEP)}
          disabled={locked || target <= MIN_TARGET}
          aria-label="Bajar objetivo"
        >
          −
        </button>
        <span className={styles.targetValue}>{target}</span>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChange(target + TARGET_STEP)}
          disabled={locked || target >= MAX_TARGET}
          aria-label="Subir objetivo"
        >
          +
        </button>
      </div>
    </header>
  )
}

interface VictoryBannerProps {
  label: string
  target: number
  onConfirm: () => void
}

function VictoryBanner({ label, target, onConfirm }: VictoryBannerProps) {
  return (
    <div className={styles.victory} role="alert">
      <span className={styles.victoryText}>
        {label} alcanzó {target} puntos
      </span>
      <button type="button" className={styles.confirm} onClick={onConfirm}>
        Confirmar final
      </button>
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
        <button type="button" className={styles.confirm} onClick={onNewGame}>
          Nueva partida
        </button>
      </div>
    </div>
  )
}
