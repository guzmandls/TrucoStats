import { ShareIcon } from '../../components/Icons'
import type { Platform } from './install'
import styles from './Install.module.css'

// Los pasos para agregar la app a la pantalla de inicio desde el navegador.
export function InstallSteps({ platform }: { platform: Platform }) {
  if (platform === 'other') {
    return (
      <p className={styles.text}>
        trucoStats está pensada para el celular. Abre este enlace en tu teléfono
        para instalarla.
      </p>
    )
  }
  const ios = platform === 'ios'
  return (
    <div className={styles.steps}>
      <ol className={styles.list}>
        {ios ? (
          <>
            <li>
              Toca <strong>Compartir</strong>{' '}
              <span className={styles.icon}>
                <ShareIcon size={18} />
              </span>{' '}
              en la barra de Safari.
            </li>
            <li>
              Elige <strong>Agregar a Inicio</strong> (si no aparece, toca{' '}
              <strong>Ver más</strong>).
            </li>
            <li>
              Deja activado <strong>Abrir como app web</strong> y toca{' '}
              <strong>Agregar</strong>.
            </li>
          </>
        ) : (
          <>
            <li>
              Abre el menú <strong>⋮</strong> de Chrome (arriba a la derecha).
            </li>
            <li>
              Toca <strong>Instalar app</strong> o{' '}
              <strong>Agregar a la pantalla principal</strong>.
            </li>
            <li>
              Confirma con <strong>Instalar</strong>.
            </li>
          </>
        )}
      </ol>
      <p className={styles.note}>
        ¿No aparece la opción? Si abriste el enlace desde WhatsApp u otra app,
        ábrelo primero en {ios ? 'Safari' : 'Chrome'}.
      </p>
    </div>
  )
}
