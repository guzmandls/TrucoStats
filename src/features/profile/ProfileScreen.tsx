import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  EmptyNote,
  Figure,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  StatRow,
  WinRateRing,
} from '../../components/ui'
import { loadGroups } from '../groups/groupsStorage'
import { loadMatches } from '../matches/matchesStorage'
import { activeMatches } from '../matches/status'
import { formatDuration, personalSummary } from '../matches/stats'
import type { Match } from '../matches/types'
import { winRateColor } from '../matches/winRateColor'
import styles from './ProfileScreen.module.css'

function percent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function duration(value: number | null): string {
  return value === null ? '—' : formatDuration(value)
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [groupCount, setGroupCount] = useState(0)

  useEffect(() => {
    let active = true
    void Promise.all([loadMatches(), loadGroups()]).then(([all, groups]) => {
      if (!active) {
        return
      }
      setMatches(all)
      setGroupCount(groups.length)
    })
    return () => {
      active = false
    }
  }, [])

  const summary = matches ? personalSummary(activeMatches(matches)) : null

  return (
    <Screen>
      <PageHeader
        title="Perfil"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent>
        {summary && summary.total === 0 ? (
          <EmptyNote>Todavía no jugaste ninguna partida</EmptyNote>
        ) : null}

        {summary && summary.total > 0 && (
          <>
            <Section>
              <div className={styles.hero}>
                <WinRateRing
                  percent={summary.winRate ?? 0}
                  color={
                    summary.winRate === null
                      ? 'var(--line-strong)'
                      : winRateColor(summary.winRate)
                  }
                  size={92}
                />
                <div className={styles.heroFigures}>
                  <Figure value={summary.wins} label="victorias" />
                  <Figure value={summary.total} label="jugadas" />
                </div>
              </div>
            </Section>

            <Section title="Resumen">
              <StatRow label="Derrotas" value={summary.losses} />
              <StatRow
                label="Duración promedio"
                value={duration(summary.averageDurationSeconds)}
              />
              <StatRow label="Grupos" value={groupCount} />
            </Section>

            <Section title="Partidas rápidas">
              <StatRow label="Jugadas" value={summary.quick.total} />
              <StatRow label="Victorias" value={summary.quick.wins} />
              <StatRow
                label="Porcentaje de victorias"
                value={percent(summary.quick.winRate)}
              />
            </Section>

            <Section title="Partidas de grupo">
              <StatRow label="Jugadas" value={summary.group.total} />
              <StatRow label="Victorias" value={summary.group.wins} />
              <StatRow
                label="Porcentaje de victorias"
                value={percent(summary.group.winRate)}
              />
            </Section>
          </>
        )}
      </ScreenContent>
    </Screen>
  )
}
