import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  ConfirmDialog,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
} from '../../components/ui'
import { HistoryRow } from '../groups/HistoryRow'
import { dayKey, dayLabel } from './dayLabel'
import { loadMatches } from './matchesStorage'
import { isQuick, pullQuickMatches, removeQuickMatch } from './quickSync'
import type { Match } from './types'
import styles from './QuickMatchesScreen.module.css'

async function loadQuick(): Promise<Match[]> {
  return (await loadMatches())
    .filter(isQuick)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
}

// Historial de partidas rápidas, con el mismo formato que el de un grupo pero
// "Nosotros" contra "Ellos", sin fotos ni puntos. Cada partida se puede
// eliminar del todo (no queda cancelada).
export function QuickMatchesScreen() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [deleting, setDeleting] = useState<Match | null>(null)

  const reload = useCallback(async () => {
    setMatches(await loadQuick())
  }, [])

  useEffect(() => {
    let active = true
    void loadQuick().then((loaded) => {
      if (active) {
        setMatches(loaded)
      }
    })
    // Trae las de la cuenta jugadas en otros celulares.
    void pullQuickMatches().then(async () => {
      if (active) {
        setMatches(await loadQuick())
      }
    })
    return () => {
      active = false
    }
  }, [])

  const days = (matches ?? []).reduce<
    { key: string; label: string; matches: Match[] }[]
  >((groups, match) => {
    const key = dayKey(match.playedAt)
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.matches.push(match)
    } else {
      groups.push({ key, label: dayLabel(match.playedAt), matches: [match] })
    }
    return groups
  }, [])

  return (
    <Screen>
      <PageHeader
        title="Partidas rápidas"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent flush>
        {matches && matches.length === 0 && (
          <EmptyNote>Todavía no hay partidas</EmptyNote>
        )}
        {days.length > 0 && (
          <div data-testid="historial">
            {days.map((day) => (
              <section key={day.key}>
                <h2 className={styles.day}>{day.label}</h2>
                {day.matches.map((match) => (
                  <HistoryRow
                    key={match.id}
                    match={match}
                    onDelete={setDeleting}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </ScreenContent>
      {deleting && (
        <ConfirmDialog
          title="¿Eliminar la partida?"
          onConfirm={() => {
            const target = deleting
            setDeleting(null)
            void removeQuickMatch(target).then(reload)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Screen>
  )
}
