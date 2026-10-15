import { type Ref } from 'react'
import { HoldButton } from '../../components/HoldButton'
import type { Team } from './counterLogic'
import { ScoreMarks } from './ScoreMarks'
import styles from './TeamPanel.module.css'

interface TeamPanelProps {
  team: Team
  label: string
  buttonLabel: string
  points: number
  reached: boolean
  canUndo: boolean
  disabled?: boolean
  side: 'left' | 'right'
  marksRef?: Ref<HTMLDivElement>
  onStart: () => void
  onEnd: () => void
  onUndo: () => void
}

export function TeamPanel({
  team,
  label,
  buttonLabel,
  points,
  reached,
  canUndo,
  disabled = false,
  side,
  marksRef,
  onStart,
  onEnd,
  onUndo,
}: TeamPanelProps) {
  return (
    <section className={`${styles.panel} ${styles[side]}`}>
      <header className={styles.header}>
        <h2 className={styles.name}>{label}</h2>
        <span className={styles.score} data-testid={`score-${team}`}>
          {points}
        </span>
      </header>

      <div className={styles.marksArea} ref={marksRef}>
        <ScoreMarks points={points} />
      </div>

      <footer className={styles.controls}>
        <button
          type="button"
          className={styles.undo}
          onClick={onUndo}
          disabled={!canUndo || disabled}
          aria-label={`Deshacer ${label}`}
        >
          ↶
        </button>
        <HoldButton
          className={`${styles.increment} ${reached ? styles.reached : ''}`}
          onStart={onStart}
          onEnd={onEnd}
          disabled={reached || disabled}
        >
          {buttonLabel}
        </HoldButton>
      </footer>
    </section>
  )
}
