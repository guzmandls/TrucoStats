import { Avatar, StatRow, WinRateRing } from '../../components/ui'
import type { MemberStats } from '../matches/groupStats'
import { formatDuration } from '../matches/stats'
import { winRateColor } from '../matches/winRateColor'
import { avatarColor } from './avatar'
import type { Member } from './types'
import styles from './MemberStats.module.css'

function orDash(value: string | null): string {
  return value ?? '—'
}

function duration(seconds: number | null): string {
  return seconds === null ? '—' : formatDuration(seconds)
}

export function MemberStatsFicha({
  member,
  stats,
}: {
  member: Member
  stats: MemberStats
}) {
  const rate = stats.winRate
  const rateColor = rate === null ? 'var(--line-strong)' : winRateColor(rate)
  const total = stats.played

  return (
    <div className={styles.ficha}>
      <Avatar
        name={member.name}
        color={avatarColor(member.id)}
        src={member.avatar}
        size={72}
      />
      <div className={styles.fichaMain}>
        <WinRateRing percent={rate ?? 0} color={rateColor} size={58} />
        <div className={styles.fichaFigures}>
          <span className={styles.fichaFigure}>
            <strong className={styles.fichaNumber}>{stats.wins}</strong>
            <span className={styles.fichaFigureLabel}>victorias</span>
          </span>
          <span className={styles.fichaFigure}>
            <strong className={styles.fichaNumber}>{stats.losses}</strong>
            <span className={styles.fichaFigureLabel}>derrotas</span>
          </span>
          <span className={styles.fichaFigure}>
            <strong className={styles.fichaNumber}>{total}</strong>
            <span className={styles.fichaFigureLabel}>jugadas</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function MemberStatsRows({ stats }: { stats: MemberStats }) {
  return (
    <>
      <StatRow
        label="Duración promedio"
        value={duration(stats.averageDurationSeconds)}
      />
      <StatRow label="Al que más le gana" value={orDash(stats.bestVictim)} />
      <StatRow
        label="Contra el que más pierde"
        value={orDash(stats.toughestRival)}
      />
      <StatRow label="Mejor compañero" value={orDash(stats.bestPartner)} />
      <StatRow label="Peor compañero" value={orDash(stats.worstPartner)} />
      <StatRow
        label="Racha más larga de victorias"
        value={stats.longestWinStreak}
      />
      <StatRow
        label="Racha más larga de derrotas"
        value={stats.longestLossStreak}
      />
    </>
  )
}
