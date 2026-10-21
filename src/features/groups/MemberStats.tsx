import {
  Avatar,
  Figure,
  Figures,
  StatRow,
  WinRateRing,
} from '../../components/ui'
import type { MemberStats } from '../matches/groupStats'
import type { Participant } from '../matches/types'
import { formatDuration } from '../matches/stats'
import { winRateColor } from '../matches/winRateColor'
import type { Member } from './types'
import styles from './MemberStats.module.css'

interface PeopleProps {
  members: Member[]
  colors: Record<string, string>
}

function PersonValue({
  person,
  members,
  colors,
}: PeopleProps & { person: Participant | null }) {
  if (!person) {
    return <>—</>
  }
  const member = members.find((item) => item.id === person.id)
  return (
    <span className={styles.person}>
      <Avatar
        name={person.name}
        color={colors[person.id]}
        src={member?.avatar}
        size={28}
      />
      {person.name}
    </span>
  )
}

function duration(seconds: number | null): string {
  return seconds === null ? '—' : formatDuration(seconds)
}

export function MemberStatsFicha({
  member,
  color,
  stats,
}: {
  member: Member
  color: string
  stats: MemberStats
}) {
  const rate = stats.winRate
  const rateColor = rate === null ? 'var(--line-strong)' : winRateColor(rate)
  const total = stats.played

  return (
    <div className={styles.ficha}>
      <div className={styles.fichaTop}>
        <Avatar
          name={member.name}
          color={color}
          src={member.avatar}
          size={72}
        />
        <WinRateRing percent={rate ?? 0} color={rateColor} size={72} />
      </div>
      <Figures>
        <Figure value={stats.wins} label="victorias" />
        <Figure value={stats.losses} label="derrotas" />
        <Figure value={total} label="jugadas" />
      </Figures>
    </div>
  )
}

export function MemberStatsRows({
  stats,
  members,
  colors,
}: PeopleProps & { stats: MemberStats }) {
  const person = (value: Participant | null) => (
    <PersonValue person={value} members={members} colors={colors} />
  )
  return (
    <>
      <StatRow
        label="Duración promedio"
        value={duration(stats.averageDurationSeconds)}
      />
      <StatRow label="Al que más le gana" value={person(stats.bestVictim)} />
      <StatRow
        label="Contra el que más pierde"
        value={person(stats.toughestRival)}
      />
      <StatRow label="Mejor compañero" value={person(stats.bestPartner)} />
      <StatRow label="Peor compañero" value={person(stats.worstPartner)} />
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
