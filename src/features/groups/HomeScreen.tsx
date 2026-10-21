import { useEffect, useState } from 'react'
import {
  ButtonLink,
  EmptyNote,
  HeaderMenu,
  PageHeader,
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
import { GroupRow } from './GroupRow'
import styles from './HomeScreen.module.css'
import { groupOverview } from '../matches/groupOverview'
import type { Match } from '../matches/types'
import { isPending } from './matchesSync'
import type { Group } from './types'

export function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([])
  const [game, setGame] = useState<PersistedGame | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
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
      setMatches(all)
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
            items={
              loggedIn
                ? [
                    {
                      label: 'Crear grupo',
                      to: '/crear-grupo',
                      icon: <GroupPlusIcon />,
                    },
                    {
                      label: 'Ver perfil',
                      to: '/perfil',
                      icon: <PersonIcon />,
                    },
                    {
                      label: 'Cerrar sesión',
                      onClick: () => void logoutAccount(),
                      icon: <ExitIcon />,
                    },
                  ]
                : [
                    // Sin cuenta registrada no se puede crear un grupo, así que
                    // esa opción ni aparece.
                    {
                      label: 'Registrarse',
                      to: '/registrarse',
                      icon: <UserPlusIcon />,
                    },
                    {
                      label: 'Iniciar sesión',
                      to: '/iniciar-sesion',
                      icon: <LoginIcon />,
                    },
                    {
                      label: 'Ver perfil',
                      to: '/perfil',
                      icon: <PersonIcon />,
                    },
                  ]
            }
          />
        }
      />
      <ScreenContent>
        {groups.length === 0 ? (
          <EmptyNote>Aún no hay grupos</EmptyNote>
        ) : (
          <div className={styles.groups}>
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                overview={groupOverview(group, matches)}
                pending={
                  matches.filter(
                    (match) => match.groupId === group.id && isPending(match),
                  ).length
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
