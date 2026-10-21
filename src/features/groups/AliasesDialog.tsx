import { useState } from 'react'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { parseAliasList } from '../matches/guests'
import { setRemoteAliases } from './groupsApi'

interface AliasesDialogProps {
  inviteCode: string
  memberId: string
  memberName: string
  aliases: string[]
  onClose: () => void
  // Se llama cuando los apodos ya quedaron guardados en el servidor.
  onSaved: () => void
}

// Edita los apodos de un integrante: los nombres con los que pudieron anotarlo
// como invitado en partidas anteriores. Las partidas de invitados con esos
// nombres pasan a contar para él.
export function AliasesDialog({
  inviteCode,
  memberId,
  memberName,
  aliases,
  onClose,
  onSaved,
}: AliasesDialogProps) {
  const [text, setText] = useState(aliases.join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await setRemoteAliases(inviteCode, memberId, parseAliasList(text))
      onSaved()
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Necesitas conexión a Internet para guardar los apodos.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog title={`Apodos de ${memberName}`} onClose={onClose} closeButton>
      <TextInput
        aria-label="Apodos"
        placeholder="Juan, Juancho, Juanito"
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Notice>
        Escribe, separados por coma, los nombres con los que pudieron anotar a
        esta persona en partidas anteriores. Esas partidas pasan a contar para
        ella.
      </Notice>
      {error && <Notice>{error}</Notice>}
      <Button disabled={busy} onClick={() => void handleSave()}>
        Guardar
      </Button>
    </Dialog>
  )
}
