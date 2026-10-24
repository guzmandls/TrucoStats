import { useState } from 'react'
import { QrCode } from '../../components/QrCode'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { sharedLink } from '../groups/liveApi'
import styles from './ShareLiveDialog.module.css'

interface ShareLiveDialogProps {
  // Id para mirar la partida.
  shareId: string
  onClose: () => void
}

// Compartir en vivo la partida rápida: un QR y un enlace para que cualquiera la
// mire desde su celular, sin cuenta. Solo se ofrece a quien tiene cuenta.
export function ShareLiveDialog({ shareId, onClose }: ShareLiveDialogProps) {
  const [message, setMessage] = useState<string | null>(null)

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
