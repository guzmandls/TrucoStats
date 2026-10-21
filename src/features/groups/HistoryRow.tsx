import { CloudOffIcon } from '../../components/Icons'
import { AvatarStack, OverflowMenu } from '../../components/ui'
import { matchMetaParts, participantNames } from '../matches/format'
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
  pointChange: number | null
  onAction: (match: Match, action: MatchAction) => void
}

function TeamLine({
  team,
  score,
  won,
  group,
}: {
  team: Participant[]
  score: number
  won: boolean
  group: Group
}) {
  const colors = avatarColors(group.members.map((member) => member.id))
  const names = participantNames(team)
  return (
    <div className={`${styles.team} ${won ? styles.won : styles.lost}`}>
      <span className={styles.avatars}>
        <AvatarStack
          size={28}
          members={team.map((player) => ({
            id: player.id,
            name: player.name,
            color: colors[player.id] ?? avatarColor(player.id),
            src: group.members.find((member) => member.id === player.id)
              ?.avatar,
          }))}
        />
      </span>
      <span className={styles.names}>{names}</span>
      <span className={styles.score}>{score}</span>
    </div>
  )
}

// Una partida del historial, como un tablero simétrico: arriba una franja con
// los datos de la partida (modalidad, objetivo, duración) y a la derecha lo que
// pasó con ella (sin enviar, puntos que sumaste o restaste, opciones); debajo,
// un renglón por equipo con sus avatares, nombres y puntaje. El puntaje del
// ganador va relleno de negro y el del perdedor solo con borde.
export function HistoryRow({
  match,
  group,
  pointChange,
  onAction,
}: HistoryRowProps) {
  const actions = availableActions(match, group)
  const pending = isPending(match)
  const showChange =
    pointChange !== null && pointChange !== 0 && !match.canceled
  const showFoot = pending || match.canceled || showChange
  return (
    <div
      data-testid="partida"
      className={`${styles.row} ${match.canceled ? styles.canceled : ''}`}
    >
      <div className={styles.head}>
        <div className={styles.meta}>
          {matchMetaParts(match).map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
        {actions.length > 0 && (
          <OverflowMenu
            label="Opciones de la partida"
            items={actions.map((action) => ({
              label:
                action === 'cancel' ? 'Cancelar partida' : 'Restaurar partida',
              onClick: () => onAction(match, action),
            }))}
          />
        )}
      </div>
      <div className={styles.teams}>
        <TeamLine
          team={match.teams.nos}
          score={match.scores.nos}
          won={match.winner === 'nos'}
          group={group}
        />
        <TeamLine
          team={match.teams.ellos}
          score={match.scores.ellos}
          won={match.winner === 'ellos'}
          group={group}
        />
      </div>
      {showFoot && (
        <div className={styles.foot}>
          <div className={styles.notes}>
            {pending && (
              <span className={styles.note}>
                <CloudOffIcon size={16} />
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
          {showChange && (
            <span
              className={`${styles.chip} ${pointChange > 0 ? styles.chipUp : styles.chipDown}`}
            >
              {pointChange > 0 ? '+' : '−'}
              {Math.abs(pointChange)} Pts
            </span>
          )}
        </div>
      )}
    </div>
  )
}
