import { type RefObject } from 'react'
import { ScrollDivider } from './ScrollDivider'
import { TeamPanel } from './TeamPanel'
import { type CounterController } from './useCounter'
import styles from './Counter.module.css'

interface CounterProps {
  counter: CounterController
  leftMarksRef: RefObject<HTMLDivElement | null>
  rightMarksRef: RefObject<HTMLDivElement | null>
  disabled?: boolean
}

export function Counter({
  counter,
  leftMarksRef,
  rightMarksRef,
  disabled = false,
}: CounterProps) {
  return (
    <div className={styles.counter}>
      <TeamPanel
        team="nos"
        label="Nosotros"
        buttonLabel="N"
        side="left"
        disabled={disabled}
        marksRef={leftMarksRef}
        points={counter.points('nos')}
        reached={counter.hasReached('nos')}
        canUndo={counter.canUndo('nos')}
        onStart={() => counter.startIncrement('nos')}
        onEnd={counter.finishIncrement}
        onUndo={() => counter.undoTeam('nos')}
      />

      <ScrollDivider leftRef={leftMarksRef} rightRef={rightMarksRef} />

      <TeamPanel
        team="ellos"
        label="Ellos"
        buttonLabel="E"
        side="right"
        disabled={disabled}
        marksRef={rightMarksRef}
        points={counter.points('ellos')}
        reached={counter.hasReached('ellos')}
        canUndo={counter.canUndo('ellos')}
        onStart={() => counter.startIncrement('ellos')}
        onEnd={counter.finishIncrement}
        onUndo={() => counter.undoTeam('ellos')}
      />
    </div>
  )
}
