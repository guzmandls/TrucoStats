import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode } from '../../components/QrCode'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { sharedLink } from '../groups/liveApi'
import styles from './ShareLiveDialog.module.css'

interface ShareLiveDialogProps {
  // Id para mirar la partida; null si falta una cuenta para compartir.
  shareId: string | null
  onClose: () => void
}

// Compartir en vivo la partida rápida: un QR y un enlace para que cualquiera la
// mire desde su celular, sin cuenta. Quien comparte necesita una cuenta.
export function ShareLiveDialog({ shareId, onClose }: ShareLiveDialogProps) {
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  if (!shareId) {
    return (
      <Dialog title="Compartir en vivo" onClose={onClose} closeButton>
        <p>
          Para compartir la partida en vivo necesitas una cuenta. Quien la mira
          no necesita cuenta.
        </p>
        <Button
          onClick={() =>
            navigate('/registrarse', { state: { from: '/partida' } })
          }
        >
          Registrarse
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate('/iniciar-sesion', { state: { from: '/partida' } })
          }
        >
          Iniciar sesión
        </Button>
      </Dialog>
    )
  }

  const link = sharedLink(shareId)
  const canShare = typeof navigator.share === 'function'

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Partida en vivo en trucoStats',
        url: link,
      })
    } catch {
      // La persona cerró el menú de compartir: no es un error.
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Enlace copiado')
    } catch {
      setMessage('No se pudo copiar. Selecciona el enlace y cópialo a mano.')
    }
  }

  return (
    <Dialog title="Compartir en vivo" onClose={onClose} closeButton>
      <p>Quien escanee el código ve la partida en vivo desde su celular.</p>
      <div className={styles.qr}>
        <QrCode value={link} label="Código QR de la partida en vivo" />
      </div>
      <TextInput
        aria-label="Enlace de la partida en vivo"
        value={link}
        readOnly
        onFocus={(event) => event.target.select()}
      />
      {message && <Notice>{message}</Notice>}
      {canShare && <Button onClick={handleShare}>Compartir enlace</Button>}
      <Button variant={canShare ? 'secondary' : 'primary'} onClick={handleCopy}>
        Copiar enlace
      </Button>
    </Dialog>
  )
}
