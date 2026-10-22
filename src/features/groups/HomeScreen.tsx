import { useEffect, useState } from 'react'
import {
  Button,
  ButtonLink,
  Dialog,
  EmptyNote,
  HeaderMenu,
  Notice,
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
import { useSession, useSessionExpired } from '../../lib/session'
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
  const sessionExpired = useSessionExpired()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const unsent = matches.filter(
    (match) => match.groupId !== null && isPending(match),
  ).length

  // Los grupos y sus partidas son de la cuenta: al cerrar sesión se quitan de
  // este celular (se recuperan al volver a iniciar sesión).
  const logout = async () => {
    setConfirmLogout(false)
    await logoutAccount()
    setGroups([])
    setMatches((all) => all.filter((match) => match.groupId === null))
  }

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
        title="trucoStats"
        trailing={
          <HeaderMenu
            label="Menú"
            headingTo={session ? '/perfil' : undefined}
            heading={
              session ? (
                <>
                  <PersonIcon size={20} />
                  {session.user.username ?? 'Invitado'}
                </>
              ) : undefined
            }
            items={
              loggedIn
                ? [
                    {
                      label: 'Crear grupo',
                      to: '/crear-grupo',
                      icon: <GroupPlusIcon />,
                    },
                    {
                      label: 'Cerrar sesión',
                      onClick: () =>
                        unsent > 0 ? setConfirmLogout(true) : void logout(),
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
                    // Con sesión (invitada) el perfil está en la primera línea del
                    // menú; sin sesión, aquí.
                    ...(session
                      ? []
                      : [
                          {
                            label: 'Ver perfil',
                            to: '/perfil',
                            icon: <PersonIcon />,
                          },
                        ]),
                  ]
            }
          />
        }
      />
      <ScreenContent>
        {confirmLogout && (
          <Dialog
            title="Partidas sin enviar"
            onClose={() => setConfirmLogout(false)}
          >
            <p>
              {unsent === 1
                ? 'Tienes 1 partida de grupo sin enviar.'
                : `Tienes ${unsent} partidas de grupo sin enviar.`}{' '}
              Si cierras sesión ahora se perderán. Conéctate a Internet para
              enviarlas antes.
            </p>
            <Button variant="secondary" onClick={() => void logout()}>
              Cerrar sesión igual
            </Button>
            <Button onClick={() => setConfirmLogout(false)}>Cancelar</Button>
          </Dialog>
        )}
        {sessionExpired && (
          <div className={styles.expired}>
            <Notice>
              Tu sesión venció. Inicia sesión para enviar tus partidas.
            </Notice>
            <ButtonLink to="/iniciar-sesion" variant="secondary">
              Iniciar sesión
            </ButtonLink>
          </div>
        )}
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
        <p className={styles.version}>Versión {__BUILD__}</p>
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
