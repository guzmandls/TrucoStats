import { useState } from 'react'
import { CloseIcon } from '../../components/Icons'
import { Button } from '../../components/ui'
import { closeInstallCard, isInstallCardClosed, useInstall } from './install'
import styles from './Install.module.css'

// Tarjeta del inicio que invita a instalar la app. Solo aparece en el
// navegador (instalada no hace falta) y, si se cierra, no vuelve: queda la
// opción del menú.
export function InstallCard({ onInstall }: { onInstall: () => void }) {
  const { installed } = useInstall()
  const [closed, setClosed] = useState(isInstallCardClosed)

  if (installed || closed) {
    return null
  }
  return (
    <section className={styles.card} aria-labelledby="install-card-title">
      <div className={styles.cardHead}>
        <h2 id="install-card-title" className={styles.cardTitle}>
          Instala la app
        </h2>
        <button
          type="button"
          className={styles.cardClose}
          aria-label="Cerrar"
          onClick={() => {
            closeInstallCard()
            setClosed(true)
          }}
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.text}>
          Tenla en tu pantalla de inicio y ábrela como una app, a pantalla
          completa.
        </p>
        <Button onClick={onInstall}>Instalar</Button>
      </div>
    </section>
  )
}
