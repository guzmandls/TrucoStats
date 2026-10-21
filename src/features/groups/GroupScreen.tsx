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
  UserPlusIcon,
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
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
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
import { dayKey, dayLabel } from '../matches/dayLabel'
import { HistoryRow } from './HistoryRow'
import type { MatchAction } from './matchActions'
import { filterMatches } from '../matches/search'
import { ApiError } from '../../lib/api'
import { getToken } from '../../lib/session'
import {
  cancelRemoteMatch,
  leaveRemoteGroup,
  registerGroup,
  restoreRemoteMatch,
} from './groupsApi'
import { saveMatch } from '../matches/matchesStorage'
import type { Match } from '../matches/types'
import { AddMemberDialog } from './AddMemberDialog'
import { isGroupAdmin } from './groupAdmin'
import { InviteDialog } from './InviteDialog'
import { MatchHistoryDialog } from './MatchHistoryDialog'
import { pullGroup, syncGroup } from './groupsSync'
import { isPending, syncPendingMatches } from './matchesSync'
import { leaveGroup, setGroupInviteCode } from './groupsStorage'
import { computePoints, pointChanges } from '../matches/points'
import { removeMembership } from './membership'
import { useGroup } from './useGroup'
import styles from './GroupScreen.module.css'

const POINTS_DELTA_KEY = 'trucostats:pointsDelta'

function readPointsDelta(): string | null {
  try {
    return sessionStorage.getItem(POINTS_DELTA_KEY)
  } catch {
    return null
  }
}

// Cuántas partidas se muestran de una vez; al llegar al final se cargan más.
const PAGE_SIZE = 20

export function GroupScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group, matches, allMatches, setGroup, reload } = useGroup(id)
  const [game, setGame] = useState<PersistedGame | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [historyOf, setHistoryOf] = useState<Match | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  // Aviso de puntos que deja la partida recién terminada: se lee al abrir la
  // pantalla y desaparece solo a los 4 segundos.
  const [pointsDelta, setPointsDelta] = useState<string | null>(readPointsDelta)
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
  // Cuántos puntos sumó o restó la persona en cada partida.
  const changes = useMemo(
    () =>
      group && matches
        ? pointChanges(
            group.members.map((member) => member.id),
            matches,
          )
        : new Map<string, Map<string, number>>(),
    [group, matches],
  )
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
    if (!pointsDelta) {
      return
    }
    try {
      sessionStorage.removeItem(POINTS_DELTA_KEY)
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
    const timer = setTimeout(() => setPointsDelta(null), 4000)
    return () => clearTimeout(timer)
  }, [pointsDelta])

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
  // El historial se muestra agrupado por día.
  const days = shown.reduce<{ key: string; label: string; matches: Match[] }[]>(
    (groups, match) => {
      const key = dayKey(match.playedAt)
      const last = groups[groups.length - 1]
      if (last?.key === key) {
        last.matches.push(match)
      } else {
        groups.push({ key, label: dayLabel(match.playedAt), matches: [match] })
      }
      return groups
    },
    [],
  )
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
    // Con el grupo en el servidor y sesión iniciada, primero se avisa al
    // servidor para que el integrante quede libre. Sin conexión no se sale, para
    // no dejarlo vinculado; si el servidor ya no nos reconoce, se sale igual.
    if (group.inviteCode && getToken()) {
      try {
        await leaveRemoteGroup(group.inviteCode)
      } catch (error) {
        const unknown =
          error instanceof ApiError && [401, 403, 404].includes(error.status)
        if (!unknown) {
          setConfirmingLeave(false)
          setLeaveError(
            error instanceof ApiError
              ? error.message
              : 'Necesitas conexión a Internet para salir del grupo.',
          )
          return
        }
      }
    }
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
              ...(isGroupAdmin(group) && group.inviteCode
                ? [
                    {
                      label: 'Agregar integrante',
                      onClick: () => setAdding(true),
                      icon: <UserPlusIcon />,
                    },
                  ]
                : []),
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
            {days.map((day) => (
              <section key={day.key}>
                <h2 className={styles.day}>{day.label}</h2>
                {day.matches.map((match) => (
                  <HistoryRow
                    key={match.id}
                    match={match}
                    group={group}
                    pointChange={
                      changes.get(match.id)?.get(userId ?? '') ?? null
                    }
                    onAction={(target, action) =>
                      setActing({ match: target, action })
                    }
                    onShowHistory={
                      group.inviteCode && group.myMemberId
                        ? setHistoryOf
                        : undefined
                    }
                  />
                ))}
              </section>
            ))}
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
      {historyOf && group.inviteCode && (
        <MatchHistoryDialog
          inviteCode={group.inviteCode}
          matchId={historyOf.id}
          onClose={() => setHistoryOf(null)}
        />
      )}
      {adding && group.inviteCode && (
        <AddMemberDialog
          inviteCode={group.inviteCode}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            void pullGroup(group.id).then(reload)
          }}
        />
      )}
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
      {leaveError && (
        <Dialog title={leaveError} onClose={() => setLeaveError(null)}>
          <Button onClick={() => setLeaveError(null)}>Entendido</Button>
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
