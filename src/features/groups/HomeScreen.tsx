import { useEffect, useState } from 'react'
import {
  ButtonLink,
  EmptyNote,
  HeaderMenu,
  PageHeader,
  PanelLink,
  Screen,
  ScreenContent,
  ScreenFooter,
} from '../../components/ui'
import {
  ExitIcon,
  GroupPlusIcon,
  LoginIcon,
  PersonIcon,
  UserPlusIcon,
} from '../../components/Icons'
import { logoutAccount } from '../auth/authApi'
import { useSession } from '../../lib/session'
import {
  QUICK_SLOT,
  gameScore,
  hasMoves,
  loadGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { loadMatches } from '../matches/matchesStorage'
import { loadGroups } from './groupsStorage'
import { hasMembership, loadMembership, replaceMembership } from './membership'
import type { Group } from './types'
import styles from './HomeScreen.module.css'

function membersLabel(group: Group): string {
  const count = group.members.length
  return `${count} ${count === 1 ? 'integrante' : 'integrantes'}`
}

function matchesLabel(count: number): string {
  return `${count} ${count === 1 ? 'partida jugada' : 'partidas jugadas'}`
}

export function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([])
  const [game, setGame] = useState<PersistedGame | null>(null)
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({})
  const session = useSession()
  const loggedIn = session?.user.username != null

  useEffect(() => {
    let active = true
    void loadGroups().then((data) => {
      if (!active) {
        return
      }
      if (!hasMembership()) {
        replaceMembership(data.map((group) => group.id))
        setGroups(data)
        return
      }
      const mine = new Set(loadMembership())
      setGroups(data.filter((group) => mine.has(group.id)))
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadGame(QUICK_SLOT).then((stored) => {
      if (active) {
        setGame(stored)
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadMatches().then((all) => {
      if (!active) {
        return
      }
      const counts: Record<string, number> = {}
      for (const match of all) {
        if (match.groupId) {
          counts[match.groupId] = (counts[match.groupId] ?? 0) + 1
        }
      }
      setMatchCounts(counts)
    })
    return () => {
      active = false
    }
  }, [])

  const score = game && hasMoves(game) ? gameScore(game) : null

  return (
    <Screen>
      <PageHeader
        title="TrucoStats"
        trailing={
          <HeaderMenu
            label="Menú"
            items={[
              {
                label: 'Crear grupo',
                to: '/crear-grupo',
                icon: <GroupPlusIcon />,
              },
              { label: 'Ver perfil', to: '/perfil', icon: <PersonIcon /> },
              ...(loggedIn
                ? [
                    {
                      label: 'Cerrar sesión',
                      onClick: () => void logoutAccount(),
                      icon: <ExitIcon />,
                    },
                  ]
                : [
                    {
                      label: 'Iniciar sesión',
                      to: '/iniciar-sesion',
                      icon: <LoginIcon />,
                    },
                    {
                      label: 'Registrarse',
                      to: '/registrarse',
                      icon: <UserPlusIcon />,
                    },
                  ]),
            ]}
          />
        }
      />
      <ScreenContent>
        {groups.length === 0 ? (
          <EmptyNote>Aún no hay grupos</EmptyNote>
        ) : (
          <div className={styles.groups}>
            {groups.map((group) => (
              <PanelLink
                key={group.id}
                to={`/grupo/${group.id}`}
                header={group.name}
                meta={
                  <>
                    <span>{membersLabel(group)}</span>
                    <span>{matchesLabel(matchCounts[group.id] ?? 0)}</span>
                  </>
                }
              />
            ))}
          </div>
        )}
      </ScreenContent>
      <ScreenFooter>
        {score ? (
          <ButtonLink to="/partida" variant="inverse">
            Continuar partida rápida · {score.nos} – {score.ellos}
          </ButtonLink>
        ) : (
          <ButtonLink to="/partida" variant="inverse">
            Partida rápida
          </ButtonLink>
        )}
      </ScreenFooter>
    </Screen>
  )
}
