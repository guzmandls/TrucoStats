import { TallyMark } from './TallyMark'
import styles from './ScoreMarks.module.css'

interface ScoreMarksProps {
  points: number
}

export function ScoreMarks({ points }: ScoreMarksProps) {
  const fullMarks = Math.floor(points / 5)
  const partial = points % 5

  return (
    <div className={styles.marks}>
      {Array.from({ length: fullMarks }, (_, index) => (
        <TallyMark key={`full-${index}`} filled={5} />
      ))}
      {partial > 0 && <TallyMark filled={partial} />}
    </div>
  )
}
