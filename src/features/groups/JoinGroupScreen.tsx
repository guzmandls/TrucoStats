import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Avatar,
  Button,
  EmptyNote,
  HeaderIconButton,
  Notice,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  TextInput,
} from '../../components/ui'
import { ApiError } from '../../lib/api'
import { avatarColors } from './avatar'
import { fetchGroupByCode, renameRemoteMember } from './groupsApi'
import { loadGroups, saveGroup } from './groupsStorage'
import { addMembership } from './membership'
import type { Group } from './types'
import styles from './JoinGroupScreen.module.css'

const MAX_NAME_LENGTH = 20

type Status = 'loading' | 'ready' | 'error'

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'No se encontró el grupo. Revisa que el enlace esté completo.'
  }
  return 'Necesitas conexión a Internet para unirte al grupo.'
}

export function JoinGroupScreen() {
  const { code = '' } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [problem, setProblem] = useState<string | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [canRetry, setCanRetry] = useState(true)

  useEffect(() => {
    let active = true
    void fetchGroupByCode(code)
      .then(async (remote) => {
        // Si ya está en este celular, se abre directamente.
        const existing = (await loadGroups()).find(
          (item) => item.id === remote.id,
        )
        if (!active) {
          return
        }
        if (existing) {
          navigate(`/grupo/${existing.id}`, { replace: true })
          return
        }
        setGroup(remote)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (active) {
          // Con un enlace que no existe, reintentar no sirve de nada.
          setCanRetry(!(error instanceof ApiError && error.status === 404))
          setProblem(loadErrorMessage(error))
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [code, attempt, navigate])

  const choose = (id: string, currentName: string) => {
    setMemberId(id)
    setName(currentName)
  }

  const handleJoin = async () => {
    if (!group || !memberId || name.trim() === '') {
      return
    }
    const chosen = group.members.find((member) => member.id === memberId)
    if (!chosen) {
      return
    }
    const finalName = name.trim()
    setJoining(true)
    setProblem(null)
    try {
      if (finalName !== chosen.name) {
        await renameRemoteMember(code, memberId, finalName)
      }
      const joined: Group = {
        ...group,
        members: group.members.map((member) =>
          member.id === memberId ? { ...member, name: finalName } : member,
        ),
        myMemberId: memberId,
      }
      await saveGroup(joined)
      addMembership(joined.id)
      navigate(`/grupo/${joined.id}`, { replace: true })
    } catch {
      setProblem(
        'No se pudo unir al grupo. Revisa tu conexión e inténtalo de nuevo.',
      )
      setJoining(false)
    }
  }

  const colors = group
    ? avatarColors(group.members.map((member) => member.id))
    : {}

  return (
    <Screen>
      <PageHeader
        title="Unirse a un grupo"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent flush>
        {status === 'loading' && <EmptyNote>Buscando el grupo…</EmptyNote>}

        {status === 'error' && (
          <div className={styles.message}>
            <Notice>{problem}</Notice>
            {canRetry && (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus('loading')
                  setAttempt((value) => value + 1)
                }}
              >
                Reintentar
              </Button>
            )}
          </div>
        )}

        {status === 'ready' && group && (
          <>
            <Section
              title={`¿Cuál de los integrantes de “${group.name}” eres?`}
            >
              <div
                className={styles.choices}
                role="radiogroup"
                aria-label="Integrantes del grupo"
              >
                {group.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    role="radio"
                    aria-label={member.name}
                    aria-checked={member.id === memberId}
                    className={`${styles.choice} ${member.id === memberId ? styles.choiceOn : ''}`}
                    onClick={() => choose(member.id, member.name)}
                  >
                    <Avatar
                      name={member.name}
                      color={colors[member.id]}
                      src={member.avatar}
                      size={40}
                    />
                    {member.name}
                  </button>
                ))}
              </div>
            </Section>

            {memberId && (
              <Section title="Tu nombre">
                <div className={styles.nameField}>
                  <TextInput
                    aria-label="Tu nombre"
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </Section>
            )}

            {problem && (
              <div className={styles.message}>
                <Notice>{problem}</Notice>
              </div>
            )}
          </>
        )}
      </ScreenContent>
      {status === 'ready' && (
        <ScreenFooter>
          <Button
            variant="inverse"
            disabled={!memberId || name.trim() === '' || joining}
            onClick={() => void handleJoin()}
          >
            Unirme al grupo
          </Button>
        </ScreenFooter>
      )}
    </Screen>
  )
}
