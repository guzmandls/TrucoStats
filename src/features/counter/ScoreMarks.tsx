import { Fragment } from 'react'
import { TallyMark } from './TallyMark'
import styles from './ScoreMarks.module.css'

interface ScoreMarksProps {
  points: number
  spacerIndex: number | null
}

export function ScoreMarks({ points, spacerIndex }: ScoreMarksProps) {
  const fullMarks = Math.floor(points / 5)
  const partial = points % 5

  const filled: number[] = []
  for (let i = 0; i < fullMarks; i += 1) {
    filled.push(5)
  }
  if (partial > 0) {
    filled.push(partial)
  }

  return (
    <div className={styles.marks}>
      {filled.map((segments, index) => (
        <Fragment key={index}>
          {index === spacerIndex && <div className={styles.spacer} />}
          <div className={styles.block}>
            <TallyMark filled={segments} />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
