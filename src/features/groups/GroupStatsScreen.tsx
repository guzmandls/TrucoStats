import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Avatar,
  AvatarStack,
  EmptyNote,
  Figure,
  Figures,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  Tabs,
  WinRateRing,
} from '../../components/ui'
import { joinNames, scoreDifferenceLabel } from '../matches/format'
import { gridColumns } from '../matches/gridColumns'
import {
  byRanking,
  groupSummary,
  headToHead,
  memberStats,
  podium as podiumOf,
  type MemberStats,
  type StreakRecord,
  type TeamStat,
} from '../matches/groupStats'
import { computePoints } from '../matches/points'
import { formatDuration } from '../matches/stats'
import type { Match } from '../matches/types'
import { winRateColor } from '../matches/winRateColor'
import { avatarColors } from './avatar'
import { HistoryRow } from './HistoryRow'
import type { Group } from './types'
import { useGroup } from './useGroup'
import styles from './GroupStatsScreen.module.css'

type Tab = 'grupales' | 'individuales' | 'enfrentamientos'

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'grupales', label: 'Grupales' },
  { value: 'individuales', label: 'Individuales' },
  { value: 'enfrentamientos', label: 'Enfrentamientos' },
]

export function GroupStatsScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group, matches } = useGroup(id)
  const [tab, setTab] = useState<Tab>('grupales')

  if (!group || !matches) {
    return (
      <Screen>
        <PageHeader
          title="Estadísticas"
          leading={
            <HeaderIconButton
              label="Volver"
              onClick={() => navigate(`/grupo/${id}`)}
            >
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  return (
    <Screen>
      <PageHeader
        title="Estadísticas"
        leading={
          <HeaderIconButton
            label="Volver"
            onClick={() => navigate(`/grupo/${group.id}`)}
          >
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <Tabs
        label="Tipo de estadísticas"
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
      />
      <ScreenContent flush>
        {matches.length === 0 ? (
          <EmptyNote>Todavía no hay partidas jugadas</EmptyNote>
        ) : tab === 'grupales' ? (
          <GroupStats group={group} matches={matches} />
        ) : tab === 'individuales' ? (
          <IndividualStats group={group} matches={matches} />
        ) : (
          <DuelStats group={group} matches={matches} />
        )}
      </ScreenContent>
    </Screen>
  )
}

function GroupStats({ group, matches }: { group: Group; matches: Match[] }) {
  const colors = avatarColors(group.members.map((member) => member.id))
  const summary = groupSummary(group, matches)
  const podium = podiumOf(group, matches)

  const recordMember = (
    stat: MemberStats | null,
    label: string,
    metric: (stat: MemberStats) => number | string,
  ) => {
    const member = stat
      ? group.members.find((item) => item.id === stat.id)
      : undefined
    return (
      <div className={styles.recordItem}>
        <span className={styles.recordLabel}>{label}</span>
        {stat ? (
          <Link
            to={`/grupo/${group.id}/participantes/${stat.id}`}
            className={styles.recordMember}
          >
            <Avatar
              name={stat.name}
              color={colors[stat.id]}
              src={member?.avatar}
              size={32}
            />
            <span className={styles.recordName}>{stat.name}</span>
            <span className={styles.recordValue}>{metric(stat)}</span>
          </Link>
        ) : (
          <span className={styles.recordEmpty}>—</span>
        )}
      </div>
    )
  }

  const stackFor = (ids: string[]) => (
    <AvatarStack
      members={ids.map((id) => {
        const member = group.members.find((item) => item.id === id)
        return {
          id,
          name: member?.name ?? id,
          color: colors[id],
          src: member?.avatar,
        }
      })}
    />
  )

  const streakRow = (label: string, streak: StreakRecord | null) => (
    <div className={styles.recordItem}>
      <span className={styles.recordLabel}>{label}</span>
      {streak ? (
        <span className={styles.recordMember}>
          {stackFor(streak.members.map((member) => member.id))}
          <span className={styles.recordName}>
            {joinNames(streak.members.map((member) => member.name))}
          </span>
          <span className={styles.recordValue}>{streak.count}</span>
        </span>
      ) : (
        <span className={styles.recordEmpty}>—</span>
      )}
    </div>
  )

  const teamRow = (label: string, team: TeamStat | null) => {
    if (!team) {
      return null
    }
    const names = joinNames(team.names)
    return (
      <div className={styles.recordItem}>
        <span className={styles.recordLabel}>{label}</span>
        <span className={styles.recordMember}>
          {stackFor(team.ids)}
          <span className={styles.recordName}>{names}</span>
          <span className={styles.recordValue}>{team.winRate}%</span>
        </span>
      </div>
    )
  }

  const podiumSlots: Array<(typeof podium)[number] | null> = [
    podium[1] ?? null,
    podium[0] ?? null,
    podium[2] ?? null,
  ]

  return (
    <>
      {podium.length > 0 && (
        <Section>
          <div className={styles.podium}>
            {podiumSlots.map((entry, index) => {
              if (!entry) {
                return (
                  <div key={`empty-${index}`} className={styles.podiumStep} />
                )
              }
              const { stat, place } = entry
              const member = group.members.find((item) => item.id === stat.id)
              return (
                <Link
                  key={stat.id}
                  to={`/grupo/${group.id}/participantes/${stat.id}`}
                  className={styles.podiumStep}
                >
                  <Avatar
                    name={stat.name}
                    color={colors[stat.id]}
                    src={member?.avatar}
                    size={place === 1 ? 64 : 52}
                  />
                  <span className={styles.podiumName}>{stat.name}</span>
                  <span className={styles.podiumPoints}>{stat.points} Pts</span>
                  <span className={styles.podiumRate}>
                    {stat.winRate === null ? '—' : `${stat.winRate}%`} ·{' '}
                    {stat.wins}-{stat.losses}
                  </span>
                  <span className={styles.podiumBase} data-place={place}>
                    <span className={styles.podiumPlace}>{place}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      <Figures>
        <Figure value={summary.totalMatches} label="partidas" />
        <Figure
          value={
            summary.averageDurationSeconds === null
              ? '—'
              : formatDuration(summary.averageDurationSeconds)
          }
          label="promedio"
        />
      </Figures>

      <Section title="Partidas">
        <div className={styles.recordList}>
          {summary.longestMatch && (
            <MatchRecord
              group={group}
              label="Más larga"
              match={summary.longestMatch}
              value={
                summary.longestMatch.durationSeconds === null
                  ? null
                  : formatDuration(summary.longestMatch.durationSeconds)
              }
            />
          )}
          {summary.shortestMatch && (
            <MatchRecord
              group={group}
              label="Más corta"
              match={summary.shortestMatch}
              value={
                summary.shortestMatch.durationSeconds === null
                  ? null
                  : formatDuration(summary.shortestMatch.durationSeconds)
              }
            />
          )}
          {summary.closestMatch && (
            <MatchRecord
              group={group}
              label="Más pareja"
              match={summary.closestMatch}
              value={scoreDifferenceLabel(summary.closestMatch)}
            />
          )}
          {summary.biggestBlowout && (
            <MatchRecord
              group={group}
              label="Mayor diferencia"
              match={summary.biggestBlowout}
              value={scoreDifferenceLabel(summary.biggestBlowout)}
            />
          )}
        </div>
      </Section>

      <Section title="Récords">
        <div className={styles.recordList}>
          {recordMember(summary.mostWins, 'Más victorias', (s) => s.wins)}
          {recordMember(
            summary.bestWinRate,
            'Mejor % de victorias',
            (s) => `${s.winRate}%`,
          )}
          {recordMember(summary.mostLosses, 'Más derrotas', (s) => s.losses)}
          {recordMember(
            summary.worstWinRate,
            'Peor % de victorias',
            (s) => `${s.winRate}%`,
          )}
          {recordMember(summary.mostPlayed, 'Más partidas', (s) => s.played)}
          {streakRow('Mayor racha de victorias', summary.longestWinStreak)}
          {streakRow('Mayor racha de derrotas', summary.longestLossStreak)}
          {streakRow('Racha de victorias en curso', summary.activeWinStreak)}
          {streakRow('Racha de derrotas en curso', summary.activeLossStreak)}
          {summary.topRivalry && (
            <div className={styles.recordItem}>
              <span className={styles.recordLabel}>Rivalidad más repetida</span>
              <span className={styles.recordMember}>
                {stackFor(
                  summary.topRivalry.members.map((member) => member.id),
                )}
                <span className={styles.recordName}>
                  {summary.topRivalry.members[0].name}{' '}
                  <span className={styles.matchVs}>vs</span>{' '}
                  {summary.topRivalry.members[1].name}
                </span>
                <span className={styles.recordValue}>
                  {summary.topRivalry.played}
                </span>
              </span>
              <span className={styles.recordMeta}>
                Victorias: {summary.topRivalry.wins[0]} –{' '}
                {summary.topRivalry.wins[1]}
              </span>
            </div>
          )}
        </div>
      </Section>

      {(summary.bestPair ||
        summary.worstPair ||
        summary.bestTrio ||
        summary.worstTrio) && (
        <Section title="Equipos">
          <div className={styles.recordList}>
            {teamRow('Mejor pareja', summary.bestPair)}
            {teamRow('Peor pareja', summary.worstPair)}
            {teamRow('Mejor trío', summary.bestTrio)}
            {teamRow('Peor trío', summary.worstTrio)}
          </div>
        </Section>
      )}
    </>
  )
}

function MatchRecord({
  label,
  match,
  group,
  value,
}: {
  label: string
  match: Match
  group: Group
  value: string | null
}) {
  return (
    <div className={styles.recordItem}>
      <div className={styles.matchRecordHead}>
        <span className={styles.matchRecordLabel}>{label}</span>
        {value && <span className={styles.matchRecordValue}>{value}</span>}
      </div>
      <HistoryRow match={match} group={group} compact />
    </div>
  )
}

function IndividualStats({
  group,
  matches,
}: {
  group: Group
  matches: Match[]
}) {
  const colors = avatarColors(group.members.map((member) => member.id))
  const points = computePoints(
    group.members.map((member) => member.id),
    matches,
  )
  const stats = group.members
    .map((member) => memberStats(member, matches, points.get(member.id) ?? 0))
    .sort(byRanking)

  return (
    <Section>
      <div className={styles.rank}>
        {stats.map((member, index) => {
          const person = group.members.find((item) => item.id === member.id)
          return (
            <Link
              key={member.id}
              to={`/grupo/${group.id}/participantes/${member.id}`}
              className={styles.rankRow}
            >
              <span className={styles.rankPos}>{index + 1}</span>
              <span className={styles.rankAvatar}>
                <Avatar
                  name={member.name}
                  color={colors[member.id]}
                  src={person?.avatar}
                  size={40}
                />
              </span>
              <span className={styles.rankInfo}>
                <span className={styles.rankName}>{member.name}</span>
                <span className={styles.rankDetail}>
                  {member.wins}V · {member.losses}D
                </span>
              </span>
              <span className={styles.rankPoints}>{member.points} Pts</span>
              <span className={styles.rankRate}>
                {member.winRate === null ? '—' : `${member.winRate}%`}
              </span>
              <span className={styles.rankBar}>
                <span
                  className={styles.rankBarFill}
                  style={{
                    width: `${member.winRate ?? 0}%`,
                    background:
                      member.winRate === null
                        ? 'var(--line-strong)'
                        : winRateColor(member.winRate),
                  }}
                />
              </span>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}

function DuelStats({ group, matches }: { group: Group; matches: Match[] }) {
  const [page, setPage] = useState(0)
  const colors = avatarColors(group.members.map((member) => member.id))
  const rows = headToHead(group, matches)
  if (rows.length === 0) {
    return <EmptyNote>Todavía no hay enfrentamientos</EmptyNote>
  }

  const members = group.members
  const matrix = new Map<string, { aWins: number; bWins: number }>()
  for (const row of rows) {
    matrix.set(`${row.a.id}|${row.b.id}`, {
      aWins: row.aWins,
      bWins: row.bWins,
    })
  }

  function cell(i: string, j: string) {
    if (i === j) {
      return null
    }
    const direct = matrix.get(`${i}|${j}`)
    if (direct) {
      return { wins: direct.aWins, losses: direct.bWins }
    }
    const reverse = matrix.get(`${j}|${i}`)
    if (reverse) {
      return { wins: reverse.bWins, losses: reverse.aWins }
    }
    return null
  }

  const cols = gridColumns(members.length)
  const totalPages = Math.ceil(members.length / cols)
  const current = Math.min(page, totalPages - 1)
  const start = current * cols
  const columns = members.slice(start, start + cols)

  return (
    <Section>
      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th scope="col" className={styles.gridCorner}>
                {totalPages > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.gridPagerButton}
                      aria-label="Integrantes anteriores"
                      disabled={current === 0}
                      onClick={() => setPage(current - 1)}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className={styles.gridPagerButton}
                      aria-label="Integrantes siguientes"
                      disabled={current >= totalPages - 1}
                      onClick={() => setPage(current + 1)}
                    >
                      ›
                    </button>
                  </>
                )}
              </th>
              {columns.map((member) => (
                <th
                  key={member.id}
                  scope="col"
                  className={styles.gridColHead}
                  title={member.name}
                >
                  <Avatar
                    name={member.name}
                    color={colors[member.id]}
                    src={member.avatar}
                    size={30}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={styles.gridRowHead}>
                  {row.name}
                </th>
                {columns.map((col) => {
                  const result = cell(row.id, col.id)
                  if (result === null) {
                    return (
                      <td
                        key={col.id}
                        className={styles.gridCell}
                        data-empty="true"
                      />
                    )
                  }
                  const total = result.wins + result.losses
                  const rate = total === 0 ? 0 : (result.wins / total) * 100
                  return (
                    <td key={col.id} className={styles.gridCell}>
                      <WinRateRing
                        percent={rate}
                        color={winRateColor(rate)}
                        size={40}
                        label={`${result.wins}–${result.losses}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
