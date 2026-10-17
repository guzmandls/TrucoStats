import { useEffect, useState } from 'react'
import { loadFinishedGames, type FinishedGame } from './gameStorage'
import styles from './HistoryScreen.module.css'

const TEAM_LABELS: Record<FinishedGame['winner'], string> = {
  nos: 'Nosotros',
  ellos: 'Ellos',
}

interface HistoryScreenProps {
  onClose: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryScreen({ onClose }: HistoryScreenProps) {
  const [games, setGames] = useState<FinishedGame[] | null>(null)

  useEffect(() => {
    let active = true
    void loadFinishedGames().then((list) => {
      if (active) {
        setGames(list)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={styles.screen} role="dialog" aria-label="Historial">
      <header className={styles.header}>
        <h2 className={styles.title}>Historial</h2>
        <button type="button" className={styles.close} onClick={onClose}>
          Volver
        </button>
      </header>

      {games !== null && games.length === 0 && (
        <p className={styles.empty}>Todavía no hay partidas finalizadas.</p>
      )}

      {games !== null && games.length > 0 && (
        <ul className={styles.list}>
          {games.map((game) => (
            <li key={game.id} className={styles.item}>
              <span className={styles.date}>{formatDate(game.playedAt)}</span>
              <span className={styles.score}>
                Nosotros {game.nos} – {game.ellos} Ellos
              </span>
              <span className={styles.winner}>
                Ganó {TEAM_LABELS[game.winner]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
