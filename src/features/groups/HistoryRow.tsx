import { CloudOffIcon } from '../../components/Icons'
import { AvatarStack, OverflowMenu } from '../../components/ui'
import {
  matchDate,
  matchDurationLabel,
  matchTime,
  participantNames,
} from '../matches/format'
import type { Match, Participant } from '../matches/types'
import { avatarColor, avatarColors } from './avatar'
import { availableActions, type MatchAction } from './matchActions'
import { isPending } from './matchesSync'
import type { Group } from './types'
import styles from './HistoryRow.module.css'

interface HistoryRowProps {
  match: Match
  // Sin grupo es una partida rápida: "Nosotros" contra "Ellos", sin fotos.
  group?: Group
  // Puntos que sumó (+) o restó (−) la persona de este celular en esta partida;
  // null si no jugó o no se sabe.
  pointChange?: number | null
  onAction?: (match: Match, action: MatchAction) => void
  // Si se pasa, el menú ofrece "Ver historial" (solo para partidas ya enviadas).
  onShowHistory?: (match: Match) => void
  // Si se pasa, el menú ofrece "Eliminar partida" (partidas rápidas).
  onDelete?: (match: Match) => void
  // Versión para las estadísticas: solo la tarjeta con la fecha debajo, sin
  // opciones ni puntos.
  compact?: boolean
}

function TeamLine({
  team,
  won,
  group,
  label,
}: {
  team: Participant[]
  won: boolean
  group?: Group
  // Nombre del equipo cuando no hay integrantes (partida rápida).
  label: string
}) {
  if (!group) {
    return (
      <div className={`${styles.team} ${won ? styles.won : styles.lost}`}>
        <span className={styles.names}>{participantNames(team) ?? label}</span>
      </div>
    )
  }
  const colors = avatarColors(group.members.map((member) => member.id))
  const names = participantNames(team)
  if (!names) {
    return null
  }
  return (
    <div className={`${styles.team} ${won ? styles.won : styles.lost}`}>
      <AvatarStack
        size={24}
        members={team.map((player) => ({
          id: player.id,
          name: player.name,
          color: colors[player.id] ?? avatarColor(player.id),
          src: group.members.find((member) => member.id === player.id)?.avatar,
        }))}
      />
      <span className={styles.names}>{names}</span>
    </div>
  )
}

// Una partida: la tarjeta con los equipos y sus puntajes (un recuadro con
// contorno; el bloque negro de la derecha lleva los dos puntajes, cada uno a la
// altura de su equipo) y, debajo, una línea con la hora, la duración y si se
// envió o se canceló. A la derecha de esa línea van los puntos que sumaste o
// restaste y el menú de opciones. En las estadísticas (`compact`) la línea de
// abajo muestra solo la fecha.
export function HistoryRow({
  match,
  group,
  pointChange = null,
  onAction = () => {},
  onShowHistory,
  onDelete,
  compact = false,
}: HistoryRowProps) {
  const actions = compact || !group ? [] : availableActions(match, group)
  const canShowHistory = !compact && onShowHistory && !isPending(match)
  const menuItems = [
    ...actions.map((action) => ({
      label: action === 'cancel' ? 'Cancelar partida' : 'Restaurar partida',
      onClick: () => onAction(match, action),
    })),
    ...(canShowHistory
      ? [{ label: 'Ver historial', onClick: () => onShowHistory(match) }]
      : []),
    ...(!compact && onDelete
      ? [{ label: 'Eliminar partida', onClick: () => onDelete(match) }]
      : []),
  ]
  const showChange =
    !compact && pointChange !== null && pointChange !== 0 && !match.canceled
  const metaParts = compact
    ? [matchDate(match)]
    : [matchTime(match), matchDurationLabel(match)].filter(
        (part): part is string => part !== null,
      )
  return (
    <div
      data-testid="partida"
      className={`${styles.row} ${compact ? styles.compact : ''} ${match.canceled ? styles.canceled : ''}`}
    >
      <span className={styles.flag} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.body}>
            <TeamLine
              team={match.teams.nos}
              won={match.winner === 'nos'}
              group={group}
              label="Nosotros"
            />
            <TeamLine
              team={match.teams.ellos}
              won={match.winner === 'ellos'}
              group={group}
              label="Ellos"
            />
          </div>
          <div className={styles.scores}>
            <span
              className={`${styles.scoreCell} ${match.winner === 'nos' ? styles.scoreWon : ''}`}
            >
              {match.scores.nos}
            </span>
            <span
              className={`${styles.scoreCell} ${match.winner === 'ellos' ? styles.scoreWon : ''}`}
            >
              {match.scores.ellos}
            </span>
          </div>
        </div>
        <div className={styles.foot}>
          <div className={styles.footLine}>
            <div className={styles.meta}>
              {metaParts.map((part) => (
                <span key={part}>{part}</span>
              ))}
              {!compact && isPending(match) && (
                <span className={styles.note}>
                  <CloudOffIcon size={14} />
                  Sin enviar
                </span>
              )}
              {match.canceled && <span className={styles.note}>Cancelada</span>}
            </div>
            {(showChange || menuItems.length > 0) && (
              <div className={styles.footEnd}>
                {showChange && (
                  <span
                    className={`${styles.chip} ${pointChange > 0 ? styles.chipUp : styles.chipDown}`}
                  >
                    {pointChange > 0 ? '+' : '−'}
                    {Math.abs(pointChange)} Pts
                  </span>
                )}
                {menuItems.length > 0 && (
                  <OverflowMenu
                    label="Opciones de la partida"
                    items={menuItems}
                  />
                )}
              </div>
            )}
          </div>
          {match.canceled?.reason && (
            <div className={styles.notes}>
              <span className={styles.reason}>
                Motivo: {match.canceled.reason}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
