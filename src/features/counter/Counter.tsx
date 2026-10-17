import { type RefObject } from 'react'
import { ScoreMarks } from './ScoreMarks'
import { ScrollDivider } from './ScrollDivider'
import { type CounterController } from './useCounter'
import styles from './Counter.module.css'

interface CounterProps {
  counter: CounterController
  drawingRef: RefObject<HTMLDivElement | null>
}

export function Counter({ counter, drawingRef }: CounterProps) {
  const { target } = counter
  const nos = counter.points('nos')
  const ellos = counter.points('ellos')

  const halfSymbols = Math.round(target / 2 / 5)
  const halfway = halfSymbols > 0 && (nos > target / 2 || ellos > target / 2)
  const spacerIndex = halfway ? halfSymbols : null

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
              top: `calc(var(--row-height) / 2 + var(--symbol-block) * ${halfSymbols})`,
            }}
          />
        )}
      </div>
    </div>
  )
}
