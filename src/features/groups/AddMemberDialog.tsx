import { useState } from 'react'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { addRemoteMember } from './groupsApi'
import { newMemberId } from './groupAdmin'

const MAX_NAME_LENGTH = 20

interface AddMemberDialogProps {
  inviteCode: string
  onClose: () => void
  // Se llama cuando el integrante ya quedó agregado en el servidor.
  onAdded: () => void
}

// Pide el nombre de un integrante nuevo y lo agrega al grupo (necesita
// conexión: el servidor es quien manda en los integrantes).
export function AddMemberDialog({
  inviteCode,
  onClose,
  onAdded,
}: AddMemberDialogProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (name.trim() === '') {
      setError('Escribe el nombre del integrante.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addRemoteMember(inviteCode, { id: newMemberId(), name })
      onAdded()
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Necesitas conexión a Internet para agregar integrantes.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog title="Agregar integrante" onClose={onClose} closeButton>
      <TextInput
        aria-label="Nombre"
        autoComplete="off"
        placeholder="Nombre"
        autoFocus
        value={name}
        maxLength={MAX_NAME_LENGTH}
        onChange={(event) => setName(event.target.value)}
      />
      {error && <Notice>{error}</Notice>}
      <Button disabled={busy} onClick={() => void handleAdd()}>
        Agregar
      </Button>
    </Dialog>
  )
}
