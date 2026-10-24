import { type RefObject } from 'react'
import { ScoreMarks } from './ScoreMarks'
import { type CounterController } from './useCounter'
import styles from './Counter.module.css'

interface CounterProps {
  // Solo se usan el objetivo, si empezó y los puntos: así también sirve para
  // mirar una partida en vivo desde otro celular.
  counter: Pick<CounterController, 'target' | 'started' | 'points'>
  drawingRef: RefObject<HTMLDivElement | null>
}

export function Counter({ counter, drawingRef }: CounterProps) {
  const { target, started } = counter
  const nos = counter.points('nos')
  const ellos = counter.points('ellos')

  const halfSymbols = Math.round(target / 2 / 5)
  const halfway =
    started && halfSymbols > 0 && (nos > target / 2 || ellos > target / 2)
  const spacerIndex = halfway ? halfSymbols : null

  return (
    <div className={styles.drawing} ref={drawingRef}>
      <div className={styles.inner}>
        <div className={styles.column}>
          <ScoreMarks points={nos} spacerIndex={spacerIndex} />
        </div>

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
      </div>
    </div>
  )
}
