import { type RefObject } from 'react'
import { ScoreMarks } from './ScoreMarks'
import { ScrollDivider } from './ScrollDivider'
import { useRowSnap } from './useRowSnap'
import {
  MAX_TARGET,
  MIN_TARGET,
  TARGET_STEP,
  type CounterController,
} from './useCounter'
import styles from './Counter.module.css'

interface CounterProps {
  counter: CounterController
  drawingRef: RefObject<HTMLDivElement | null>
}

export function Counter({ counter, drawingRef }: CounterProps) {
  const { target, started, setTarget } = counter
  const nos = counter.points('nos')
  const ellos = counter.points('ellos')

  const halfSymbols = Math.round(target / 2 / 5)
  const halfway =
    started && halfSymbols > 0 && (nos > target / 2 || ellos > target / 2)
  const spacerIndex = halfway ? halfSymbols : null
  const objectiveTop = useRowSnap(drawingRef, 3)

  return (
    <div className={styles.drawing} ref={drawingRef}>
      <div className={styles.inner}>
        <div className={styles.column}>
          <ScoreMarks points={nos} spacerIndex={spacerIndex} />
        </div>

        <ScrollDivider drawingRef={drawingRef} />

        <div className={styles.column}>
          <ScoreMarks points={ellos} spacerIndex={spacerIndex} />
        </div>

        {halfway && (
          <div
            className={styles.halfLine}
            style={{
              top: `calc(var(--symbol-block) * ${halfSymbols} + var(--row-height))`,
            }}
          />
        )}

        {!started && (
          <div
            className={styles.objective}
            style={{ top: `${objectiveTop}px` }}
          >
            <div className={styles.objectiveLeft}>
              <span className={styles.objectiveLabel}>Objetivo:</span>
            </div>
            <div className={styles.objectiveRight}>
              <span className={styles.objectiveValue}>{target}</span>
              <div className={styles.objectiveSteps}>
                <button
                  type="button"
                  className={styles.objectiveStep}
                  onClick={() => setTarget(target + TARGET_STEP)}
                  disabled={target >= MAX_TARGET}
                  aria-label="Subir objetivo"
                >
                  +
                </button>
                <button
                  type="button"
                  className={styles.objectiveStep}
                  onClick={() => setTarget(target - TARGET_STEP)}
                  disabled={target <= MIN_TARGET}
                  aria-label="Bajar objetivo"
                >
                  −
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
