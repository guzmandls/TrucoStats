import { CloudOffIcon } from '../../components/Icons'
import { AvatarStack, OverflowMenu } from '../../components/ui'
import {
  matchDurationLabel,
  matchMetaParts,
  participantNames,
} from '../matches/format'
import { matchWhen } from '../matches/groupOverview'
import type { Match, Participant } from '../matches/types'
import { avatarColor, avatarColors } from './avatar'
import { availableActions, type MatchAction } from './matchActions'
import { isPending } from './matchesSync'
import type { Group } from './types'
import styles from './HistoryRow.module.css'

interface HistoryRowProps {
  match: Match
  group: Group
  // Puntos que sumó (+) o restó (−) la persona de este celular en esta partida;
  // null si no jugó o no se sabe.
  pointChange?: number | null
  onAction?: (match: Match, action: MatchAction) => void
  // Versión para las estadísticas: sin modalidad ni objetivo, con la hora de la
  // partida y si se envió en la misma línea de arriba, y sin opciones.
  compact?: boolean
}

function TeamLine({
  team,
  won,
  group,
}: {
  team: Participant[]
  won: boolean
  group: Group
}) {
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

// Una partida del historial: arriba una línea con los datos (modalidad,
// objetivo, duración) y lo que pasó con ella (sin enviar, cancelada, puntos que
// sumaste o restaste, opciones); debajo, a la izquierda cada equipo con sus
// avatares (el ganador resaltado) y a la derecha un bloque negro con los dos
// puntajes, cada uno a la altura de su equipo.
export function HistoryRow({
  match,
  group,
  pointChange = null,
  onAction = () => {},
  compact = false,
}: HistoryRowProps) {
  const actions = compact ? [] : availableActions(match, group)
  const metaParts = compact
    ? [matchDurationLabel(match), matchWhen(match)].filter(
        (part): part is string => part !== null,
      )
    : matchMetaParts(match)
  const showChange =
    pointChange !== null && pointChange !== 0 && !match.canceled
  return (
    <div
      data-testid="partida"
      className={`${styles.row} ${compact ? styles.compact : ''} ${match.canceled ? styles.canceled : ''}`}
    >
      <span className={styles.flag} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.head}>
          <div className={styles.meta}>
            {metaParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
            {compact && isPending(match) && (
              <span className={styles.note}>
                <CloudOffIcon size={14} />
                Sin enviar
              </span>
            )}
          </div>
          <div className={styles.headEnd}>
            {showChange && (
              <span
                className={`${styles.chip} ${pointChange > 0 ? styles.chipUp : styles.chipDown}`}
              >
                {pointChange > 0 ? '+' : '−'}
                {Math.abs(pointChange)} Pts
              </span>
            )}
            {actions.length > 0 && (
              <OverflowMenu
                label="Opciones de la partida"
                items={actions.map((action) => ({
                  label:
                    action === 'cancel'
                      ? 'Cancelar partida'
                      : 'Restaurar partida',
                  onClick: () => onAction(match, action),
                }))}
              />
            )}
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.body}>
            <TeamLine
              team={match.teams.nos}
              won={match.winner === 'nos'}
              group={group}
            />
            <TeamLine
              team={match.teams.ellos}
              won={match.winner === 'ellos'}
              group={group}
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
        {!compact && (isPending(match) || match.canceled) && (
          <div className={styles.foot}>
            {isPending(match) && (
              <span className={styles.note}>
                <CloudOffIcon size={14} />
                Sin enviar
              </span>
            )}
            {match.canceled && <span className={styles.note}>Cancelada</span>}
            {match.canceled?.reason && (
              <span className={styles.reason}>
                Motivo: {match.canceled.reason}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
