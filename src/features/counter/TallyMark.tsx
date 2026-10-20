import styles from './TallyMark.module.css'

const SEGMENTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [4, 4, 4, 36],
  [4, 4, 36, 4],
  [36, 4, 36, 36],
  [4, 36, 36, 36],
  [4, 36, 36, 4],
]

interface TallyMarkProps {
  filled: number
}

export function TallyMark({ filled }: TallyMarkProps) {
  return (
    <svg className={styles.mark} viewBox="0 0 40 40" aria-hidden="true">
      {SEGMENTS.map(([x1, y1, x2, y2], index) => (
        <line
          key={`${x1}-${y1}-${x2}-${y2}`}
          className={index < filled ? styles.drawn : styles.empty}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
        />
      ))}
    </svg>
  )
}
