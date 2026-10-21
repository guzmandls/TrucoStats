import { Link } from 'react-router-dom'
import {
  ChevronRightIcon,
  CloudOffIcon,
  TrophyIcon,
} from '../../components/Icons'
import { AvatarStack } from '../../components/ui'
import { matchWhen, type GroupOverview } from '../matches/groupOverview'
import { avatarColors } from './avatar'
import type { Group } from './types'
import styles from './GroupRow.module.css'

const MAX_AVATARS = 8

interface GroupRowProps {
  group: Group
  overview: GroupOverview
  // Partidas de este grupo que todavía no llegaron al servidor.
  pending: number
}

function countsLabel(overview: GroupOverview): string {
  const members = overview.memberCount
  const matches = overview.matchCount
  return `${members} ${members === 1 ? 'integrante' : 'integrantes'} · ${matches} ${matches === 1 ? 'partida jugada' : 'partidas jugadas'}`
}

function PositionBadge({ position }: { position: number }) {
  return (
    <span className={styles.position}>
      {position <= 3 && <TrophyIcon place={position as 1 | 2 | 3} />}
      {position}º
    </span>
  )
}

// Un grupo en la pantalla principal: una banda negra con el nombre y, a la
// derecha, tu posición (con trofeo en el podio) y una flecha ">" que indica que
// es un botón. Debajo, en crema: las cantidades (con la nube de partidas sin
// enviar a la derecha), los avatares de los 8 primeros del ranking con tus
// puntos, y cuándo fue la última partida.
export function GroupRow({ group, overview, pending }: GroupRowProps) {
  const colors = avatarColors(group.members.map((member) => member.id))
  const visible = overview.ranking.slice(0, MAX_AVATARS)
  const showPoints = overview.points !== null && overview.matchCount > 0
  return (
    <Link className={styles.row} to={`/grupo/${group.id}`}>
      <span className={styles.head}>
        <span className={styles.nameLine}>
          <span className={styles.name}>{group.name}</span>
        </span>
        <span className={styles.headEnd}>
          {overview.position !== null && (
            <PositionBadge position={overview.position} />
          )}
          <ChevronRightIcon size={24} />
        </span>
      </span>
      <span className={styles.info}>
        <span className={styles.countsLine}>
          <span className={styles.counts}>{countsLabel(overview)}</span>
          {pending > 0 && (
            <span
              className={styles.pending}
              role="status"
              aria-label={`${pending} ${pending === 1 ? 'partida sin enviar' : 'partidas sin enviar'}`}
            >
              <CloudOffIcon size={18} />
              {pending}
            </span>
          )}
        </span>
        <span className={styles.middle}>
          <span className={styles.avatars}>
            <AvatarStack
              size={30}
              members={visible.map((member) => ({
                id: member.id,
                name: member.name,
                color: colors[member.id],
                src: member.avatar,
              }))}
            />
          </span>
          {showPoints && (
            <span className={styles.points}>
              <b>{overview.points}</b> Pts
            </span>
          )}
        </span>
        <span className={styles.last}>
          {overview.last
            ? `Última partida: ${matchWhen(overview.last)}`
            : 'Sin partidas todavía'}
        </span>
      </span>
    </Link>
  )
}
