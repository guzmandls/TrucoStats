import { useState } from 'react'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { inviteLink } from './groupsApi'
import type { Group } from './types'

interface InviteDialogProps {
  group: Group & { inviteCode: string }
  onClose: () => void
}

export function InviteDialog({ group, onClose }: InviteDialogProps) {
  const [message, setMessage] = useState<string | null>(null)
  const link = inviteLink(group.inviteCode)
  const canShare = typeof navigator.share === 'function'

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Únete a ${group.name} en trucoStats`,
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
    <Dialog title="Invitar al grupo" onClose={onClose}>
      <TextInput
        aria-label="Enlace de invitación"
        value={link}
        readOnly
        onFocus={(event) => event.target.select()}
      />
      {message && <Notice>{message}</Notice>}
      {canShare && <Button onClick={handleShare}>Compartir</Button>}
      <Button variant={canShare ? 'secondary' : 'primary'} onClick={handleCopy}>
        Copiar enlace
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
    </Dialog>
  )
}
