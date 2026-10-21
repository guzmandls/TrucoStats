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

// Una partida del historial, en tres columnas alineadas con las dos líneas de
// equipos: a la izquierda un bloque negro vertical con los datos de la partida
// (y los puntos que sumaste o restaste), en el medio cada equipo con sus
// avatares (el ganador resaltado) y a la derecha un bloque negro con los dos
// puntajes.
export function HistoryRow({
  match,
  group,
  pointChange,
  onAction,
}: HistoryRowProps) {
  const actions = availableActions(match, group)
  const notes = [
    isPending(match) ? 'Sin enviar' : null,
    match.canceled ? 'Cancelada' : null,
  ].filter((note): note is string => note !== null)
  return (
    <div
      data-testid="partida"
      className={`${styles.row} ${match.canceled ? styles.canceled : ''}`}
    >
      <div className={styles.main}>
        <div className={styles.info}>
          {matchMetaParts(match).map((part) => (
            <span key={part}>{part}</span>
          ))}
          {notes.map((note) => (
            <span key={note} className={styles.note}>
              {note}
            </span>
          ))}
          {pointChange !== null && pointChange !== 0 && !match.canceled && (
            <span
              className={`${styles.chip} ${pointChange > 0 ? styles.chipUp : styles.chipDown}`}
            >
              {pointChange > 0 ? '+' : '−'}
              {Math.abs(pointChange)} Pts
            </span>
          )}
        </div>
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
      {match.canceled?.reason && (
        <span className={styles.reason}>Motivo: {match.canceled.reason}</span>
      )}
    </div>
  )
}
