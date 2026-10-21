import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ExitIcon,
  BackIcon,
  ChartIcon,
  CloseIcon,
  CloudOffIcon,
  PeopleIcon,
  SearchIcon,
  ShareIcon,
} from '../../components/Icons'
import {
  ButtonLink,
  Button,
  ConfirmDialog,
  Dialog,
  EmptyNote,
  HeaderIconButton,
  HeaderMenu,
  Notice,
  OverflowMenu,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  TextInput,
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
import { filterMatches } from '../matches/search'
import { ApiError } from '../../lib/api'
import {
  cancelRemoteMatch,
  registerGroup,
  restoreRemoteMatch,
} from './groupsApi'
import { availableActions, type MatchAction } from './matchActions'
import { saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { InviteDialog } from './InviteDialog'
import { syncGroup } from './groupsSync'
import { isPending, syncPendingMatches } from './matchesSync'
import { leaveGroup, setGroupInviteCode } from './groupsStorage'
import { computePoints } from '../matches/points'
import { removeMembership } from './membership'
import { useGroup } from './useGroup'
import styles from './GroupScreen.module.css'

// Cuántas partidas se muestran de una vez; al llegar al final se cargan más.
const PAGE_SIZE = 20

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group, matches, allMatches, setGroup, reload } = useGroup(id)
  const [game, setGame] = useState<PersistedGame | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [pointsDelta, setPointsDelta] = useState<string | null>(null)
  // Partida sobre la que se está cancelando o restaurando.
  const [acting, setActing] = useState<{
    match: Match
    action: MatchAction
  } | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const found = useMemo(
    () => filterMatches(allMatches ?? [], query),
    [allMatches, query],
  )
  // Sin IntersectionObserver (navegadores muy viejos) se muestran todas.
  const paged = typeof IntersectionObserver !== 'undefined'
  const shown = paged ? found.slice(0, visible) : found
  const hasMore = shown.length < found.length
  // Qué integrante es la persona de este celular (null si no se sabe).
  const userId = group?.myMemberId ?? null
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

  // Al abrir el grupo y cuando vuelve la conexión: envía las partidas
  // pendientes y trae lo que cambiaron los demás.
  // Scroll infinito: cuando el final de la lista se acerca a la pantalla, se
  // muestran 20 partidas más.
  useEffect(() => {
    const end = sentinelRef.current
    if (!end || !hasMore) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible((count) => count + PAGE_SIZE)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [hasMore, visible, query])

  useEffect(() => {
    if (!id) {
      return
    }
    const sync = () => {
      void syncGroup(id).then((changed) => {
        if (changed) {
          reload()
        }
      })
    }
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [id, reload])

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

  const pendingCount = matches.filter(isPending).length
  const inProgress = game && hasMoves(game) ? game : null
  const score = inProgress ? gameScore(inProgress) : null
  const willDelete = group.members.length === 1

  // Si el grupo todavía no está en el servidor, se registra antes de invitar.
  const handleInvite = async () => {
    if (group.inviteCode) {
      setInviting(true)
      return
    }
    try {
      const inviteCode = await registerGroup(group)
      const updated = await setGroupInviteCode(group.id, inviteCode)
      if (updated) {
        setGroup(updated)
      }
      setInviting(true)
    } catch (error) {
      setInviteError(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para invitar a otras personas.',
      )
    }
  }

  const closeAction = () => {
    setActing(null)
    setReason('')
    setActionError(null)
  }

  // Cancela o restaura en el servidor y deja la partida igual en este celular.
  // Hace falta conexión: el servidor es quien valida los permisos.
  const handleConfirmAction = async () => {
    if (!acting || !group.inviteCode) {
      setActionError('El grupo todavía no está en el servidor.')
      return
    }
    const { match, action } = acting
    setBusy(true)
    setActionError(null)
    try {
      // Una partida que no se envió todavía tiene que llegar primero.
      if (isPending(match)) {
        await syncPendingMatches()
      }
      const remote =
        action === 'cancel'
          ? await cancelRemoteMatch(group.inviteCode, match.id, reason)
          : await restoreRemoteMatch(group.inviteCode, match.id)
      const { canceled, ...rest } = match
      void canceled
      await saveMatch({
        ...rest,
        syncedAt: match.syncedAt ?? new Date().toISOString(),
        ...(remote.createdBy ? { createdBy: remote.createdBy } : {}),
        ...(remote.registeredAt ? { registeredAt: remote.registeredAt } : {}),
        ...(remote.canceled ? { canceled: remote.canceled } : {}),
      })
      closeAction()
      reload()
    } catch (error) {
      setActionError(
        error instanceof ApiError && error.status !== 404
          ? error.message
          : 'Necesitas conexión a Internet para hacerlo. Inténtalo de nuevo cuando la tengas.',
      )
    } finally {
      setBusy(false)
    }
  }

  const toggleSearch = () => {
    setSearching((open) => !open)
    setQuery('')
    setVisible(PAGE_SIZE)
  }

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
          <span className={styles.headerInfo}>
            {pendingCount > 0 && (
              <span
                className={styles.pendingBadge}
                role="status"
                aria-label={`${pendingCount} ${pendingCount === 1 ? 'partida sin enviar' : 'partidas sin enviar'}`}
                title="Se enviarán al servidor cuando haya conexión"
              >
                <CloudOffIcon size={18} />
                {pendingCount}
              </span>
            )}
            {myPoints !== null && (
              <span className={styles.headerPoints}>{myPoints} Pts</span>
            )}
          </span>
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
                label: searching ? 'Cerrar búsqueda' : 'Búsqueda',
                onClick: toggleSearch,
                icon: <SearchIcon />,
              },
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
                label: 'Invitar',
                onClick: handleInvite,
                icon: <ShareIcon />,
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
        {searching && (
          <div className={styles.searchBar}>
            <TextInput
              className={styles.searchInput}
              type="search"
              aria-label="Buscar en el historial"
              placeholder="Jugador, fecha o resultado"
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setVisible(PAGE_SIZE)
              }}
            />
            <button
              type="button"
              className={styles.searchClose}
              aria-label="Cerrar búsqueda"
              onClick={toggleSearch}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        )}
        {(allMatches ?? []).length === 0 ? (
          <EmptyNote>Todavía no hay partidas</EmptyNote>
        ) : found.length === 0 ? (
          <EmptyNote>Ninguna partida coincide con la búsqueda</EmptyNote>
        ) : (
          <div data-testid="historial">
            <Section>
              {shown.map((match) => {
                const nos = participantNames(match.teams.nos)
                const ellos = participantNames(match.teams.ellos)
                const actions = availableActions(match, group)
                return (
                  <div
                    key={match.id}
                    data-testid="partida"
                    className={`${styles.matchRow} ${match.canceled ? styles.matchCanceled : ''}`}
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
                        {isPending(match) && ' · Sin enviar'}
                        {match.canceled && ' · Cancelada'}
                      </span>
                      {match.canceled?.reason && (
                        <span className={styles.matchMeta}>
                          Motivo: {match.canceled.reason}
                        </span>
                      )}
                    </div>
                    {actions.length > 0 && (
                      <OverflowMenu
                        label="Opciones de la partida"
                        items={actions.map((action) => ({
                          label:
                            action === 'cancel'
                              ? 'Cancelar partida'
                              : 'Restaurar partida',
                          onClick: () => setActing({ match, action }),
                        }))}
                      />
                    )}
                  </div>
                )
              })}
            </Section>
            {hasMore && <div ref={sentinelRef} aria-hidden="true" />}
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
      {inviting && group.inviteCode && (
        <InviteDialog
          group={{ ...group, inviteCode: group.inviteCode }}
          onClose={() => setInviting(false)}
        />
      )}
      {acting?.action === 'cancel' && (
        <Dialog
          title="¿Cancelar esta partida?"
          onClose={closeAction}
          closeButton
        >
          <TextInput
            aria-label="Motivo (opcional)"
            placeholder="Motivo (opcional)"
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
          />
          {actionError && <Notice>{actionError}</Notice>}
          <Button disabled={busy} onClick={() => void handleConfirmAction()}>
            Cancelar partida
          </Button>
        </Dialog>
      )}
      {acting?.action === 'restore' && (
        <Dialog
          title="¿Restaurar esta partida?"
          onClose={closeAction}
          closeButton
        >
          {actionError && <Notice>{actionError}</Notice>}
          <Button disabled={busy} onClick={() => void handleConfirmAction()}>
            Restaurar partida
          </Button>
        </Dialog>
      )}
      {inviteError && (
        <Dialog title={inviteError} onClose={() => setInviteError(null)}>
          <Button onClick={() => setInviteError(null)}>Entendido</Button>
        </Dialog>
      )}
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
