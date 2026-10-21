import { useRef } from 'react'
import { Button, Dialog } from '../../components/ui'
import styles from './PhotoDialog.module.css'

interface PhotoDialogProps {
  hasPhoto: boolean
  busy: boolean
  // Se llama con la imagen que eligió la persona.
  onFile: (file: File) => void
  onRemove: () => void
  onClose: () => void
}

// Ventana para editar la foto: elegir una nueva (o cambiar la actual) y, si ya
// hay una, quitarla. Se abre al tocar la foto.
export function PhotoDialog({
  hasPhoto,
  busy,
  onFile,
  onRemove,
  onClose,
}: PhotoDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog title="Editar foto" onClose={onClose} closeButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        aria-label="Archivo de la foto"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            onFile(file)
          }
        }}
      />
      <Button disabled={busy} onClick={() => fileRef.current?.click()}>
        {hasPhoto ? 'Cambiar foto' : 'Agregar foto'}
      </Button>
      {hasPhoto && (
        <Button variant="secondary" disabled={busy} onClick={onRemove}>
          Quitar foto
        </Button>
      )}
    </Dialog>
  )
}
