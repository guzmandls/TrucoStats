import { useState } from 'react'
import { CloseIcon, DownloadIcon } from '../../components/Icons'
import { closeInstallCard, isInstallCardClosed, useInstall } from './install'
import styles from './Install.module.css'

// Fila del inicio que invita a instalar la app. Solo aparece en el
// navegador (instalada no hace falta) y, si se cierra, no vuelve: queda la
// opción del menú.
export function InstallCard({ onInstall }: { onInstall: () => void }) {
  const { installed } = useInstall()
  const [closed, setClosed] = useState(isInstallCardClosed)

  if (installed || closed) {
    return null
  }
  return (
    <section className={styles.bar} aria-label="Instalar app">
      <span className={styles.barText}>Instalar app</span>
      <button
        type="button"
        className={styles.barInstall}
        aria-label="Instalar"
        onClick={onInstall}
      >
        <DownloadIcon size={22} />
      </button>
      <button
        type="button"
        className={styles.barClose}
        aria-label="Cerrar"
        onClick={() => {
          closeInstallCard()
          setClosed(true)
        }}
      >
        <CloseIcon size={20} />
      </button>
    </section>
  )
}
