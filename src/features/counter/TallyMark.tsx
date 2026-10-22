import styles from './TallyMark.module.css'

// Un cuadrado de cinco trazos: los cuatro lados y la diagonal. Cada punto suma
// un trazo, en este orden.
const SEGMENTS: ReadonlyArray<string> = [
  'M4 4 L4 36',
  'M4 4 L36 4',
  'M36 4 L36 36',
  'M4 36 L36 36',
  'M4 36 L36 4',
]
const DIAGONAL = 4

interface TallyMarkProps {
  filled: number
  // Trazo que se acaba de sumar: se dibuja con una breve animación.
  drawing?: number | null
}

export function TallyMark({ filled, drawing = null }: TallyMarkProps) {
  return (
    <svg className={styles.mark} viewBox="0 0 40 40" aria-hidden="true">
      {SEGMENTS.map((d, index) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          className={[
            index < filled ? styles.drawn : styles.empty,
            index === DIAGONAL ? styles.diagonal : '',
            index === drawing ? styles.drawing : '',
          ].join(' ')}
        />
      ))}
    </svg>
  )
}
