import { useState } from 'react'
import { Avatar, Button, Dialog, Notice } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { avatarColors } from './avatar'
import { claimRemoteMember, joinRemoteGroup } from './groupsApi'
import type { Group } from './types'
import styles from './ClaimMemberDialog.module.css'

interface ClaimMemberDialogProps {
  group: Group
  inviteCode: string
  // 'claim': grupo creado antes de las cuentas, sin administrador vinculado (quien
  // lo creó pasa a ser administrador). 'join': hay que elegir un lugar libre.
  mode: 'claim' | 'join'
  // Integrantes que ya eligió otra persona (no se pueden elegir).
  takenIds: string[]
  onClose: () => void
  // Se llama cuando el integrante ya quedó vinculado a la cuenta.
  onClaimed: () => void
}

// La cuenta de esta persona todavía no está vinculada a ningún integrante del
// grupo (por ejemplo, en un grupo creado antes de las cuentas): elige cuál es. Sin
// ese vínculo el servidor no deja enviar ni recibir partidas.
export function ClaimMemberDialog({
  group,
  inviteCode,
  mode,
  takenIds,
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
      if (mode === 'claim') {
        await claimRemoteMember(inviteCode, chosen)
      } else {
        const member = group.members.find((item) => item.id === chosen)
        await joinRemoteGroup(inviteCode, chosen, member?.name ?? '')
      }
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
        {mode === 'claim'
          ? 'Este grupo se creó antes de las cuentas y todavía no tiene un administrador vinculado. Elige quién eres para aparecer como integrante y administrar el grupo.'
          : 'Tu cuenta todavía no está vinculada a ningún integrante de este grupo, y por eso no se envían ni se reciben partidas. Elige quién eres.'}
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
            disabled={takenIds.includes(member.id)}
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
            {takenIds.includes(member.id) && (
              <span className={styles.taken}>Ya elegido</span>
            )}
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
