import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Avatar,
  Figure,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  Tabs,
  WinRateRing,
} from '../../components/ui'
import { matchScore } from '../matches/format'
import { gridColumns } from '../matches/gridColumns'
import {
  groupSummary,
  headToHead,
  memberStats,
  podium as podiumOf,
  type MemberStats,
  type TeamStat,
} from '../matches/groupStats'
import { formatDuration } from '../matches/stats'
import type { Match } from '../matches/types'
import { winRateColor } from '../matches/winRateColor'
import { avatarColor } from './avatar'
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
          <p className={styles.empty}>Todavía no hay partidas jugadas</p>
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
              color={avatarColor(stat.id)}
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

  const teamRow = (label: string, team: TeamStat | null) => {
    if (!team) {
      return null
    }
    const names =
      team.names.length <= 1
        ? (team.names[0] ?? '')
        : `${team.names.slice(0, -1).join(', ')} y ${team.names[team.names.length - 1]}`
    return (
      <div className={styles.recordItem}>
        <span className={styles.recordLabel}>{label}</span>
        <span className={styles.recordMember}>
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
                    color={avatarColor(stat.id)}
                    src={member?.avatar}
                    size={place === 1 ? 64 : 52}
                  />
                  <span className={styles.podiumName}>{stat.name}</span>
                  <span className={styles.podiumPoints}>
                    {stat.points} Pts
                  </span>
                  <span
                    className={styles.podiumRate}
                    style={{
                      color:
                        stat.winRate === null
                          ? undefined
                          : winRateColor(stat.winRate),
                    }}
                  >
                    {stat.winRate === null ? '—' : `${stat.winRate}%`} · <span style={{ color: 'var(--ink)' }}>{stat.wins}-{stat.losses}</span>
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

      <Section>
        <div className={styles.figures}>
          <Figure value={summary.totalMatches} label="partidas" />
          <Figure
            value={
              summary.averageDurationSeconds === null
                ? '—'
                : formatDuration(summary.averageDurationSeconds)
            }
            label="promedio"
          />
        </div>
      </Section>

      <Section title="Partidas">
        <div className={styles.records}>
          {summary.longestMatch && (
            <div className={styles.record}>
              <span className={styles.recordScore}>
                {matchScore(summary.longestMatch)}
              </span>
              <span className={styles.recordLabel}>Más larga</span>
              {summary.longestMatch.durationSeconds !== null && (
                <span className={styles.recordMeta}>
                  {formatDuration(summary.longestMatch.durationSeconds)}
                </span>
              )}
            </div>
          )}
          {summary.shortestMatch && (
            <div className={styles.record}>
              <span className={styles.recordScore}>
                {matchScore(summary.shortestMatch)}
              </span>
              <span className={styles.recordLabel}>Más corta</span>
              {summary.shortestMatch.durationSeconds !== null && (
                <span className={styles.recordMeta}>
                  {formatDuration(summary.shortestMatch.durationSeconds)}
                </span>
              )}
            </div>
          )}
          {summary.biggestBlowout && (
            <div className={styles.record}>
              <span className={styles.recordScore}>
                {Math.abs(
                  summary.biggestBlowout.scores.nos -
                    summary.biggestBlowout.scores.ellos,
                )}
              </span>
              <span className={styles.recordLabel}>Mayor diferencia</span>
              <span className={styles.recordMeta}>
                {matchScore(summary.biggestBlowout)}
              </span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Récords">
        <div className={styles.recordList}>
          {recordMember(summary.mostWins, 'Más victorias', (s) => s.wins)}
          {recordMember(
            summary.bestWinRate,
            'Mejor winrate',
            (s) => `${s.winRate}%`,
          )}
          {recordMember(summary.mostLosses, 'Más derrotas', (s) => s.losses)}
          {recordMember(
            summary.worstWinRate,
            'Peor winrate',
            (s) => `${s.winRate}%`,
          )}
          {recordMember(summary.mostPlayed, 'Más partidas', (s) => s.played)}
          {summary.longestWinStreak && (
            <div className={styles.recordItem}>
              <span className={styles.recordLabel}>Racha más larga</span>
              <span className={styles.recordMember}>
                <span className={styles.recordName}>
                  {summary.longestWinStreak.member}
                </span>
                <span className={styles.recordValue}>
                  {summary.longestWinStreak.count}
                </span>
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

function IndividualStats({
  group,
  matches,
}: {
  group: Group
  matches: Match[]
}) {
  const stats = group.members
    .map((member) => memberStats(member, matches))
    .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1))

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
                  color={avatarColor(member.id)}
                  src={person?.avatar}
                  size={40}
                />
              </span>
              <span className={styles.rankName}>{member.name}</span>
              <span className={styles.rankDetail}>
                {member.wins}V · {member.losses}D
              </span>
              <span
                className={styles.rankRate}
                style={{
                  color:
                    member.winRate === null
                      ? undefined
                      : winRateColor(member.winRate),
                }}
              >
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
  const rows = headToHead(group, matches)
  if (rows.length === 0) {
    return <p className={styles.empty}>Todavía no hay enfrentamientos</p>
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
                    color={avatarColor(member.id)}
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
