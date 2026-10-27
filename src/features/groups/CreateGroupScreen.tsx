import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  ConfirmDialog,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  Stepper,
  TextInput,
} from '../../components/ui'
import { useSession } from '../../lib/session'
import type { Group, Member } from './types'
import { registerGroup } from './groupsApi'
import { saveGroup, setGroupInviteCode } from './groupsStorage'
import { addMembership } from './membership'
import styles from './CreateGroupScreen.module.css'

function createId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function CreateGroupScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [count, setCount] = useState(2)
  const [confirming, setConfirming] = useState(false)
  const session = useSession()
  const registered = session?.user.username != null
  // El integrante del creador sugiere su usuario, que puede cambiar.
  const [members, setMembers] = useState<Member[]>([
    { id: createId(), name: session?.user.username ?? '' },
    { id: createId(), name: '' },
  ])

  // Crear un grupo exige una cuenta registrada: si falta, se pide y se vuelve.
  useEffect(() => {
    if (!registered) {
      navigate('/registrarse', {
        replace: true,
        state: { from: '/crear-grupo' },
      })
    }
  }, [registered, navigate])

  const hasData =
    name.trim() !== '' ||
    members.some((member, index) => index !== 0 && member.name.trim() !== '')

  const handleCancel = () => {
    if (hasData) {
      setConfirming(true)
    } else {
      navigate('/')
    }
  }

  const handleCountChange = (newCount: number) => {
    const nextCount = Math.max(1, newCount)
    setCount(nextCount)
    setMembers((prev) => {
      const next: Member[] = []
      for (let i = 0; i < nextCount; i += 1) {
        next.push(prev[i] ?? { id: createId(), name: '' })
      }
      return next
    })
  }

  const handleMemberNameChange = (index: number, newName: string) => {
    setMembers((prev) => {
      const next = prev.slice()
      if (next[index]) {
        next[index] = { ...next[index], name: newName }
      }
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const now = new Date().toISOString()
    const adminId = members[0]?.id ?? createId()
    const group: Group = {
      id: createId(),
      name: name.trim() || 'Grupo',
      members,
      adminMemberIds: [adminId],
      createdAt: now,
      myMemberId: adminId,
    }
    await saveGroup(group)
    addMembership(group.id)
    // Sin conexión no pasa nada: el grupo ya está guardado en el celular y se
    // registra en el servidor la próxima vez que se invite a alguien.
    void registerGroup(group)
      .then((inviteCode) => setGroupInviteCode(group.id, inviteCode))
      .catch(() => undefined)
    navigate('/')
  }

  return (
    <Screen>
      <PageHeader
        title="Crear grupo"
        leading={
          <HeaderIconButton label="Volver" onClick={handleCancel}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <form className={styles.form} onSubmit={handleSubmit}>
        <ScreenContent>
          <Section title="Nombre del grupo">
            <div className={styles.groupName}>
              <TextInput
                aria-label="Nombre del grupo"
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={20}
              />
            </div>
          </Section>

          <Section title="Cantidad de integrantes">
            <div className={styles.quantityBody}>
              <Stepper
                value={count}
                min={1}
                decreaseLabel="Eliminar integrante"
                increaseLabel="Agregar integrante"
                onDecrease={() => handleCountChange(count - 1)}
                onIncrease={() => handleCountChange(count + 1)}
              />
            </div>
          </Section>

          <Section title="Integrantes">
            <div className={styles.members}>
              {members.map((member, index) => (
                <label key={member.id} className={styles.memberRow}>
                  <span className={styles.memberIndex}>{index + 1}</span>
                  <input
                    className={styles.memberInput}
                    aria-label={`Integrante ${index + 1}`}
                    autoComplete="off"
                    placeholder={
                      index === 0 ? 'Tu nombre' : 'Nombre del integrante'
                    }
                    value={member.name}
                    onChange={(event) =>
                      handleMemberNameChange(index, event.target.value)
                    }
                    required
                    maxLength={20}
                  />
                </label>
              ))}
            </div>
          </Section>
        </ScreenContent>

        <ScreenFooter>
          <Button type="submit" variant="inverse">
            Guardar grupo
          </Button>
        </ScreenFooter>
      </form>
      {confirming && (
        <ConfirmDialog
          title="¿Quieres cancelar la creación del grupo?"
          onConfirm={() => navigate('/')}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Screen>
  )
}
