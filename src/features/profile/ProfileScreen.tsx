import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon, PencilIcon } from '../../components/Icons'
import {
  Avatar,
  EmptyNote,
  Figure,
  Figures,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  StatRow,
  WinRateRing,
} from '../../components/ui'
import { isRegistered, useSession } from '../../lib/session'
import { loadGroups } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { loadMatches } from '../matches/matchesStorage'
import { activeMatches } from '../matches/status'
import { formatDuration, personalSummary } from '../matches/stats'
import type { Match } from '../matches/types'
import { winRateColor } from '../matches/winRateColor'
import { myMatches } from './myMatches'
import { myPhoto } from './myPhoto'
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
  const [groups, setGroups] = useState<Group[]>([])
  const session = useSession()
  const groupCount = groups.length

  useEffect(() => {
    let active = true
    void Promise.all([loadMatches(), loadGroups()]).then(([all, groups]) => {
      if (!active) {
        return
      }
      setMatches(all)
      setGroups(groups)
    })
    return () => {
      active = false
    }
  }, [])

  const summary = matches
    ? personalSummary(myMatches(activeMatches(matches), groups))
    : null

  const photo = myPhoto(groups)
  // Hay algo para editar si se sabe quién eres en algún grupo (la foto) o si
  // tienes una cuenta registrada (usuario, correo y contraseña).
  const canEdit = photo !== null || isRegistered(session)
  const edit = () => navigate('/perfil/editar')

  return (
    <Screen>
      <PageHeader
        title="Perfil"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
        trailing={
          canEdit ? (
            <HeaderIconButton label="Editar perfil" onClick={edit}>
              <PencilIcon />
            </HeaderIconButton>
          ) : undefined
        }
      />
      <ScreenContent flush>
        {/* Arriba, la foto y el porcentaje lado a lado; debajo, las cifras. */}
        {(photo || (summary && summary.total > 0)) && (
          <div className={styles.top}>
            {photo && (
              // Tocar la foto lleva a editar el perfil.
              <button
                type="button"
                className={styles.photoButton}
                aria-label="Editar perfil"
                onClick={edit}
              >
                <Avatar
                  name={photo.name}
                  color={photo.color}
                  src={photo.src}
                  size={92}
                />
              </button>
            )}
            {summary && summary.total > 0 && (
              <WinRateRing
                percent={summary.winRate ?? 0}
                color={
                  summary.winRate === null
                    ? 'var(--line-strong)'
                    : winRateColor(summary.winRate)
                }
                size={92}
              />
            )}
          </div>
        )}

        {summary && summary.total === 0 ? (
          <EmptyNote>Todavía no jugaste ninguna partida</EmptyNote>
        ) : null}

        {summary && summary.total > 0 && (
          <>
            <div className={styles.figures}>
              <Figures>
                <Figure value={summary.wins} label="victorias" />
                <Figure value={summary.total} label="jugadas" />
              </Figures>
            </div>

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
