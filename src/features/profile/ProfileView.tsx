import type { ReactNode } from 'react'
import {
  Avatar,
  Figure,
  Figures,
  Section,
  StatRow,
  WinRateRing,
} from '../../components/ui'
import { formatDuration, type PersonalSummary } from '../matches/stats'
import { winRateColor } from '../matches/winRateColor'
import styles from './ProfileScreen.module.css'

export interface Personal extends PersonalSummary {
  // En cuántos grupos está.
  groups: number
}

interface ProfileViewProps {
  photo: { name: string; color: string; src?: string }
  // Si se pasa, tocar la foto la llama (tu propio perfil: abre "Editar perfil").
  onPhoto?: () => void
  // Estadísticas personales; null si no hay (todavía no se conocen o nadie
  // eligió ese lugar).
  personal: Personal | null
  // Lo que va debajo: las estadísticas en grupos.
  children?: ReactNode
}

function percent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function duration(value: number | null): string {
  return value === null ? '—' : formatDuration(value)
}

// El perfil de una persona, igual se entre desde el inicio o desde un grupo:
// arriba la foto y el porcentaje de victorias; después las estadísticas
// personales (todas sus partidas) y, debajo, las de sus grupos.
export function ProfileView({
  photo,
  onPhoto,
  personal,
  children,
}: ProfileViewProps) {
  const avatar = (
    <Avatar name={photo.name} color={photo.color} src={photo.src} size={92} />
  )
  const played = personal !== null && personal.total > 0
  return (
    <>
      <div className={styles.top}>
        {onPhoto ? (
          <button
            type="button"
            className={styles.photoButton}
            aria-label="Editar perfil"
            onClick={onPhoto}
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
        {played && (
          <WinRateRing
            percent={personal.winRate ?? 0}
            color={
              personal.winRate === null
                ? 'var(--line-strong)'
                : winRateColor(personal.winRate)
            }
            size={92}
          />
        )}
      </div>

      {played && (
        <>
          <div className={styles.figures}>
            <Figures>
              <Figure value={personal.wins} label="victorias" />
              <Figure value={personal.total} label="jugadas" />
            </Figures>
          </div>

          <Section title="Estadísticas personales">
            <StatRow label="Derrotas" value={personal.losses} />
            <StatRow
              label="Duración promedio"
              value={duration(personal.averageDurationSeconds)}
            />
            <StatRow label="Grupos" value={personal.groups} />
          </Section>

          <Section title="Partidas rápidas">
            <StatRow label="Jugadas" value={personal.quick.total} />
            <StatRow label="Victorias" value={personal.quick.wins} />
            <StatRow
              label="Porcentaje de victorias"
              value={percent(personal.quick.winRate)}
            />
          </Section>

          <Section title="Partidas de grupo">
            <StatRow label="Jugadas" value={personal.group.total} />
            <StatRow label="Victorias" value={personal.group.wins} />
            <StatRow
              label="Porcentaje de victorias"
              value={percent(personal.group.winRate)}
            />
          </Section>
        </>
      )}

      {children}
    </>
  )
}
