import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon, PencilIcon } from '../../components/Icons'
import {
  CardLink,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
} from '../../components/ui'
import { isRegistered, useSession } from '../../lib/session'
import { loadGroups } from '../groups/groupsStorage'
import type { Group } from '../groups/types'
import { memberStats } from '../matches/groupStats'
import { forStats } from '../matches/guests'
import { loadMatches } from '../matches/matchesStorage'
import { pullQuickMatches } from '../matches/quickSync'
import { personalSummary } from '../matches/stats'
import { activeMatches } from '../matches/status'
import type { Match } from '../matches/types'
import { myMatches } from './myMatches'
import { myMembers, myPhoto } from './myPhoto'
import { ProfileView } from './ProfileView'
import styles from './ProfileScreen.module.css'

// Tus estadísticas en un grupo, en una línea.
function groupLine(group: Group, memberId: string, matches: Match[]): string {
  const member = group.members.find((item) => item.id === memberId)
  if (!member) {
    return ''
  }
  const stats = memberStats(
    member,
    forStats(
      group,
      activeMatches(matches.filter((match) => match.groupId === group.id)),
    ),
  )
  const parts = [
    `${stats.wins} ${stats.wins === 1 ? 'victoria' : 'victorias'}`,
    `${stats.played} ${stats.played === 1 ? 'jugada' : 'jugadas'}`,
  ]
  if (stats.winRate !== null) {
    parts.push(`${stats.winRate}%`)
  }
  return parts.join(' · ')
}

// Tu perfil, abierto desde el inicio: tus estadísticas personales y una fila
// por cada grupo, que abre tu perfil en ese grupo (con el detalle).
export function ProfileScreen() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const session = useSession()

  useEffect(() => {
    let active = true
    const load = () =>
      Promise.all([loadMatches(), loadGroups()]).then(([all, loaded]) => {
        if (active) {
          setMatches(all)
          setGroups(loaded)
        }
      })
    void load()
    // Las partidas rápidas jugadas en otros celulares también cuentan.
    void pullQuickMatches().then(load)
    return () => {
      active = false
    }
  }, [])

  const summary = matches
    ? personalSummary(myMatches(activeMatches(matches), groups))
    : null
  const photo = myPhoto(groups) ?? {
    name: session?.user.username ?? session?.user.name ?? '',
    color: 'var(--ink-muted)',
  }
  // Hay algo para editar si se sabe quién eres en algún grupo (la foto) o si
  // tienes una cuenta registrada (usuario, correo y contraseña).
  const canEdit = myPhoto(groups) !== null || isRegistered(session)
  const edit = () => navigate('/perfil/editar')
  const mine = myMembers(groups)

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
        {summary && (
          <ProfileView
            photo={photo}
            onPhoto={canEdit ? edit : undefined}
            personal={{ ...summary, groups: groups.length }}
          >
            {summary.total === 0 && (
              <EmptyNote>Todavía no jugaste ninguna partida</EmptyNote>
            )}
            {mine.length > 0 && matches && (
              <Section title="Estadísticas en grupos">
                <div className={styles.groups}>
                  {mine.map(({ group, member }) => (
                    <CardLink
                      key={group.id}
                      to={`/grupo/${group.id}/participantes/${member.id}`}
                      meta={groupLine(group, member.id, matches)}
                    >
                      {group.name}
                    </CardLink>
                  ))}
                </div>
              </Section>
            )}
          </ProfileView>
        )}
      </ScreenContent>
    </Screen>
  )
}
