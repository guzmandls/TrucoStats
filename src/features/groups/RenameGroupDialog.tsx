import { useState } from 'react'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { renameRemoteGroup } from './groupsApi'
import { renameGroup } from './groupsStorage'
import type { Group } from './types'

const MAX_NAME_LENGTH = 20

interface RenameGroupDialogProps {
  group: Group
  onClose: () => void
  // Se llama con el grupo ya renombrado en este celular.
  onSaved: (group: Group) => void
}

// Cambia el nombre del grupo (lo hace un administrador). Si el grupo está en el
// servidor hace falta conexión: el servidor comprueba que sea administrador y
// los demás ven el nombre nuevo al actualizar. Un grupo que todavía no se
// compartió se renombra solo en este celular.
export function RenameGroupDialog({
  group,
  onClose,
  onSaved,
}: RenameGroupDialogProps) {
  const [name, setName] = useState(group.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Escribe un nombre.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = group.inviteCode
        ? await renameRemoteGroup(group.inviteCode, trimmed)
        : trimmed
      const updated = await renameGroup(group.id, saved)
      if (updated) {
        onSaved(updated)
      }
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Necesitas conexión a Internet para cambiar el nombre del grupo.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog title="Cambiar nombre del grupo" onClose={onClose} closeButton>
      <TextInput
        aria-label="Nombre del grupo"
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
