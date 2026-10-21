import { useState } from 'react'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { renameRemoteMember } from './groupsApi'

const MAX_NAME_LENGTH = 20

interface RenameMemberDialogProps {
  inviteCode: string
  memberId: string
  currentName: string
  onClose: () => void
  // Se llama cuando el nombre ya quedó cambiado en el servidor.
  onSaved: () => void
}

// Cambia el nombre de un integrante (lo puede hacer él mismo, o un
// administrador si todavía nadie eligió ese lugar). Necesita conexión: el
// servidor también actualiza el nombre en las partidas ya guardadas.
export function RenameMemberDialog({
  inviteCode,
  memberId,
  currentName,
  onClose,
  onSaved,
}: RenameMemberDialogProps) {
  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (name.trim() === '') {
      setError('Escribe un nombre.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await renameRemoteMember(inviteCode, memberId, name)
      onSaved()
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Necesitas conexión a Internet para cambiar el nombre.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog title="Cambiar nombre" onClose={onClose} closeButton>
      <TextInput
        aria-label="Nombre"
        autoFocus
        value={name}
        maxLength={MAX_NAME_LENGTH}
        onChange={(event) => setName(event.target.value)}
      />
      {error && <Notice>{error}</Notice>}
      <Button disabled={busy} onClick={() => void handleSave()}>
        Guardar
      </Button>
    </Dialog>
  )
}
