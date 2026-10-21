import { useState } from 'react'
import { Avatar, Button, Dialog, Notice } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { avatarColors } from './avatar'
import { claimRemoteMember } from './groupsApi'
import type { Group } from './types'
import styles from './ClaimMemberDialog.module.css'

interface ClaimMemberDialogProps {
  group: Group
  inviteCode: string
  onClose: () => void
  // Se llama cuando el integrante ya quedó vinculado a la cuenta.
  onClaimed: () => void
}

// Un grupo creado antes de las cuentas no tiene a nadie vinculado: la persona
// que lo creó elige cuál de los integrantes es y pasa a ser su administrador.
export function ClaimMemberDialog({
  group,
  inviteCode,
  onClose,
  onClaimed,
}: ClaimMemberDialogProps) {
  const [chosen, setChosen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const colors = avatarColors(group.members.map((member) => member.id))

  const handleClaim = async () => {
    if (!chosen) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await claimRemoteMember(inviteCode, chosen)
      onClaimed()
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Necesitas conexión a Internet para hacerlo.',
      )
      setBusy(false)
    }
  }

  return (
    <Dialog title="¿Cuál de los integrantes eres?" onClose={onClose}>
      <p className={styles.help}>
        Este grupo se creó antes de las cuentas y todavía no tiene a nadie
        vinculado. Elige quién eres para aparecer como integrante y administrar
        el grupo.
      </p>
      <div
        className={styles.choices}
        role="radiogroup"
        aria-label="Integrantes"
      >
        {group.members.map((member) => (
          <button
            key={member.id}
            type="button"
            role="radio"
            aria-label={member.name}
            aria-checked={member.id === chosen}
            className={`${styles.choice} ${member.id === chosen ? styles.choiceOn : ''}`}
            onClick={() => setChosen(member.id)}
          >
            <Avatar
              name={member.name}
              color={colors[member.id]}
              src={member.avatar}
              size={32}
            />
            {member.name}
          </button>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      <Button disabled={!chosen || busy} onClick={() => void handleClaim()}>
        Soy yo
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Ahora no
      </Button>
    </Dialog>
  )
}
