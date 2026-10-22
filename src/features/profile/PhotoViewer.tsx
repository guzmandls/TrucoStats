import { useEffect } from 'react'
import { CloseIcon } from '../../components/Icons'
import styles from './EditProfile.module.css'

// La foto en pantalla completa, sobre negro. Se cierra tocando en cualquier
// lado, con la X o con Escape.
export function PhotoViewer({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="Foto de perfil"
      onClick={onClose}
    >
      <img className={styles.viewerImage} src={src} alt={alt} />
      <button
        type="button"
        className={styles.viewerClose}
        aria-label="Cerrar"
        onClick={onClose}
      >
        <CloseIcon size={24} />
      </button>
    </div>
  )
}
