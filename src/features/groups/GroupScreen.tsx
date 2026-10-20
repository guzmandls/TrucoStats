import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ExitIcon,
  BackIcon,
  ChartIcon,
  PeopleIcon,
} from '../../components/Icons'
import {
  ButtonLink,
  ConfirmDialog,
  EmptyNote,
  HeaderIconButton,
  HeaderMenu,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
} from '../../components/ui'
import {
  contextOf,
  gameScore,
  groupSlot,
  hasMoves,
  loadGame,
  type PersistedGame,
} from '../counter/gameStorage'
import { matchMeta, participantNames } from '../matches/format'
import { leaveGroup } from './groupsStorage'
import { computePoints } from '../matches/points'
import { removeMembership } from './membership'
import { useGroup } from './useGroup'
import styles from './GroupScreen.module.css'

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group, matches } = useGroup(id)
  const userId =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('trucostats:profileId')
      : null
  const [game, setGame] = useState<PersistedGame | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [pointsDelta, setPointsDelta] = useState<string | null>(null)
  const myPoints = useMemo(() => {
    if (!group || !matches || !userId) {
      return null
    }
    const map = computePoints(
      group.members.map((member) => member.id),
      matches,
    )
    return map.get(userId) ?? null
  }, [group, matches, userId])

  useEffect(() => {
    if (!group) {
      return
    }
    let active = true
    void loadGame(groupSlot(group.id)).then((stored) => {
      if (active) {
        setGame(stored)
      }
    })
    return () => {
      active = false
    }
  }, [group])

  useEffect(() => {
    try {
      const v = sessionStorage.getItem('trucostats:pointsDelta')
      if (v) {
        setPointsDelta(v)
        sessionStorage.removeItem('trucostats:pointsDelta')
        const t = setTimeout(() => setPointsDelta(null), 4000)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  if (!group || !matches) {
    return (
      <Screen>
        <PageHeader
          title="Grupo"
          leading={
            <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  const inProgress = game && hasMoves(game) ? game : null
  const score = inProgress ? gameScore(inProgress) : null
  const willDelete = group.members.length === 1

  const handleLeave = async () => {
    await leaveGroup(group)
    removeMembership(group.id)
    navigate('/')
  }

  return (
    <Screen>
      <PageHeader
        title={group.name}
        center={
          myPoints === null ? undefined : (
            <span className={styles.headerPoints}>{myPoints} Pts</span>
          )
        }
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
        trailing={
          <HeaderMenu
            label="Menú"
            items={[
              {
                label: 'Estadísticas',
                to: `/grupo/${group.id}/estadisticas`,
                icon: <ChartIcon />,
              },
              {
                label: 'Participantes',
                to: `/grupo/${group.id}/participantes`,
                icon: <PeopleIcon />,
              },
              {
                label: 'Salir del grupo',
                onClick: () => setConfirmingLeave(true),
                icon: <ExitIcon />,
              },
            ]}
          />
        }
      />
      <ScreenContent flush>
        {matches.length === 0 ? (
          <EmptyNote>Todavía no hay partidas</EmptyNote>
        ) : (
          <div data-testid="historial">
            <Section>
              {matches.map((match) => {
                const nos = participantNames(match.teams.nos)
                const ellos = participantNames(match.teams.ellos)
                return (
                  <div
                    key={match.id}
                    data-testid="partida"
                    className={styles.matchRow}
                  >
                    <span className={styles.matchFlag} aria-hidden="true" />
                    <div className={styles.matchBody}>
                      <div className={styles.matchScore}>
                        <span
                          className={
                            match.winner === 'nos'
                              ? styles.scoreWin
                              : styles.scoreLoss
                          }
                        >
                          {match.scores.nos}
                        </span>
                        <span className={styles.scoreDash}>–</span>
                        <span
                          className={
                            match.winner === 'ellos'
                              ? styles.scoreWin
                              : styles.scoreLoss
                          }
                        >
                          {match.scores.ellos}
                        </span>
                      </div>
                      {nos && ellos && (
                        <span className={styles.matchTeams}>
                          {nos} <span className={styles.matchVs}>vs</span>{' '}
                          {ellos}
                        </span>
                      )}
                      <span className={styles.matchMeta}>
                        {matchMeta(match)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </Section>
          </div>
        )}
      </ScreenContent>
      {pointsDelta && (
        <div className={styles.deltaOverlay}>
          {pointsDelta
            .split(',')
            .map((item) => {
              const [id, val] = item.split(':')
              if (id === userId && val) {
                return (
                  <span key={id} className={styles.deltaText}>
                    {val.startsWith('-') ? val : `+${val}`} Pts
                  </span>
                )
              }
              return null
            })
            .filter(Boolean)}
        </div>
      )}
      <ScreenFooter>
        {inProgress && score ? (
          <ButtonLink
            to="/partida"
            variant="inverse"
            state={{
              gameContext: contextOf(inProgress),
              target: inProgress.target,
            }}
          >
            Continuar partida · {score.nos} – {score.ellos}
          </ButtonLink>
        ) : (
          <ButtonLink to={`/partida-grupo/${group.id}`} variant="inverse">
            Iniciar partida
          </ButtonLink>
        )}
      </ScreenFooter>
      {confirmingLeave && (
        <ConfirmDialog
          title={
            willDelete
              ? `¿Salir y eliminar “${group.name}”? Se borrarán las estadísticas del grupo. Tus partidas jugadas seguirán contando en tu perfil.`
              : `¿Quieres salir del grupo “${group.name}”?`
          }
          confirmLabel="Salir"
          onConfirm={handleLeave}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}
    </Screen>
  )
}
