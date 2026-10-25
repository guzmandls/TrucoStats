import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BackIcon,
  ChevronRightIcon,
  PlusIcon,
  ShieldIcon,
} from '../../components/Icons'
import {
  Avatar,
  ConfirmDialog,
  Dialog,
  HeaderIconButton,
  OverflowMenu,
  PageHeader,
  Button,
  Screen,
  ScreenContent,
} from '../../components/ui'
import { ApiError } from '../../lib/api'
import { AddMemberDialog } from './AddMemberDialog'
import { AliasesDialog } from './AliasesDialog'
import { fileToAvatarDataUrl, UNREADABLE_IMAGE } from './imageFile'
import { PhotoDialog } from './PhotoDialog'
import { avatarColors } from './avatar'
import { RenameMemberDialog } from './RenameMemberDialog'
import { isGroupAdmin } from './groupAdmin'
import {
  fetchGroupByCode,
  releaseRemoteMember,
  removeRemoteMember,
  setRemoteAvatar,
  setRemoteMemberAdmin,
} from './groupsApi'
import { pullGroup } from './groupsSync'
import type { Member } from './types'
import { useGroup } from './useGroup'
import styles from './ParticipantsScreen.module.css'

type Pending =
  | { kind: 'remove'; member: Member }
  | { kind: 'release'; member: Member }
  | { kind: 'rename'; member: Member }
  | { kind: 'aliases'; member: Member }
  | { kind: 'add' }
  | { kind: 'photo'; member: Member }

export function ParticipantsScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group, reload } = useGroup(id)
  // Qué integrantes ya eligió una persona (solo se consulta si soy administrador).
  const [claimed, setClaimed] = useState<string[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const admin = group ? isGroupAdmin(group) : false
  const inviteCode = group?.inviteCode

  // Cada vez que cambia este número se vuelve a consultar al servidor.
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!admin || !inviteCode) {
      return
    }
    let active = true
    fetchGroupByCode(inviteCode)
      .then((remote) => {
        if (active) {
          setClaimed(remote.claimedMemberIds)
        }
      })
      .catch(() => {
        // Sin conexión: se muestran solo las acciones que no dependen de eso.
      })
    return () => {
      active = false
    }
  }, [admin, inviteCode, refreshKey])

  if (!group) {
    return (
      <Screen>
        <PageHeader
          title="Participantes"
          leading={
            <HeaderIconButton
              label="Volver"
              onClick={() => navigate(`/grupo/${id}`)}
            >
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  const colors = avatarColors(group.members.map((member) => member.id))

  // Ejecuta una acción de administración y vuelve a traer el grupo.
  const run = async (action: () => Promise<void>) => {
    setPending(null)
    try {
      await action()
      await pullGroup(group.id)
      reload()
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para hacerlo.',
      )
    }
  }

  // Pone (o quita, con null) la foto de un integrante que nadie eligió.
  const savePhoto = async (member: Member, file: File | null) => {
    setPhotoBusy(true)
    try {
      let dataUrl: string | null = null
      if (file) {
        try {
          dataUrl = await fileToAvatarDataUrl(file)
        } catch {
          setPending(null)
          setMessage(UNREADABLE_IMAGE)
          return
        }
      }
      await run(() => setRemoteAvatar(inviteCode!, member.id, dataUrl))
    } finally {
      setPhotoBusy(false)
    }
  }

  const menuItems = (member: Member) => {
    if (!inviteCode) {
      return []
    }
    const isMe = member.id === group.myMemberId
    const isClaimed = claimed.includes(member.id)
    const isAdminMember = group.adminMemberIds.includes(member.id)
    // Cada uno cambia su nombre y sus apodos; el administrador, el nombre de quien
    // nadie eligió todavía y los apodos de cualquiera.
    const ownItems = [
      ...(isMe || (admin && !isClaimed)
        ? [
            {
              label: 'Cambiar nombre',
              onClick: () => setPending({ kind: 'rename', member }),
            },
          ]
        : []),
      {
        label: 'Editar apodos',
        onClick: () => setPending({ kind: 'aliases', member }),
      },
    ]
    if (!admin) {
      return isMe ? ownItems : []
    }
    return [
      ...ownItems,
      ...(isAdminMember
        ? [
            {
              label: 'Eliminar de administradores',
              onClick: () =>
                void run(() =>
                  setRemoteMemberAdmin(inviteCode, member.id, false),
                ),
            },
          ]
        : isClaimed
          ? [
              {
                label: 'Hacer administrador',
                onClick: () =>
                  void run(() =>
                    setRemoteMemberAdmin(inviteCode, member.id, true),
                  ),
              },
            ]
          : []),
      // La foto de quien ya eligió su lugar es la de su cuenta: solo la cambia
      // esa persona. La de un lugar libre la pone el administrador.
      ...(!isClaimed
        ? [
            {
              label: 'Cambiar foto',
              onClick: () => setPending({ kind: 'photo', member }),
            },
          ]
        : []),
      ...(isClaimed && !isMe
        ? [
            {
              label: 'Liberar integrante',
              onClick: () => setPending({ kind: 'release', member }),
            },
          ]
        : []),
      {
        label: 'Eliminar del grupo',
        onClick: () => setPending({ kind: 'remove', member }),
      },
    ]
  }

  return (
    <Screen>
      <PageHeader
        title="Participantes"
        leading={
          <HeaderIconButton
            label="Volver"
            onClick={() => navigate(`/grupo/${group.id}`)}
          >
            <BackIcon />
          </HeaderIconButton>
        }
        trailing={
          admin && inviteCode ? (
            <HeaderIconButton
              label="Agregar integrante"
              onClick={() => setPending({ kind: 'add' })}
            >
              <PlusIcon />
            </HeaderIconButton>
          ) : undefined
        }
      />
      <ScreenContent>
        <div className={styles.list}>
          {group.members.map((member) => {
            const items = menuItems(member)
            const to = `/grupo/${group.id}/participantes/${member.id}`
            return (
              <div key={member.id} className={styles.member}>
                <Link to={to} className={styles.main}>
                  <Avatar
                    name={member.name}
                    color={colors[member.id]}
                    src={member.avatar}
                    size={48}
                  />
                  <span className={styles.memberText}>
                    <span className={styles.memberName}>{member.name}</span>
                    {(member.aliases ?? []).length > 0 && (
                      <span className={styles.memberAliases}>
                        {(member.aliases ?? []).join(', ')}
                      </span>
                    )}
                  </span>
                  {group.adminMemberIds.includes(member.id) && (
                    <span
                      className={styles.shield}
                      role="img"
                      aria-label="Administrador"
                    >
                      <ShieldIcon size={26} />
                    </span>
                  )}
                </Link>
                {items.length > 0 && (
                  <div className={styles.menu}>
                    <OverflowMenu
                      label={`Opciones de ${member.name}`}
                      items={items}
                    />
                  </div>
                )}
                <Link
                  to={to}
                  className={styles.go}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <ChevronRightIcon size={24} />
                </Link>
              </div>
            )
          })}
        </div>
      </ScreenContent>
      {pending?.kind === 'remove' && (
        <ConfirmDialog
          title={`¿Eliminar a ${pending.member.name} del grupo? Dejará de aparecer, pero sus partidas se conservan.`}
          confirmLabel="Eliminar"
          onConfirm={() =>
            void run(() => removeRemoteMember(inviteCode!, pending.member.id))
          }
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'release' && (
        <ConfirmDialog
          title={`¿Liberar a ${pending.member.name}? La persona que lo eligió podrá elegir otro integrante y este quedará libre.`}
          confirmLabel="Liberar"
          onConfirm={() =>
            void run(() => releaseRemoteMember(inviteCode!, pending.member.id))
          }
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'rename' && inviteCode && (
        <RenameMemberDialog
          inviteCode={inviteCode}
          memberId={pending.member.id}
          currentName={pending.member.name}
          onClose={() => setPending(null)}
          onSaved={() => void run(() => Promise.resolve())}
        />
      )}
      {pending?.kind === 'aliases' && inviteCode && (
        <AliasesDialog
          inviteCode={inviteCode}
          memberId={pending.member.id}
          memberName={pending.member.name}
          aliases={pending.member.aliases ?? []}
          onClose={() => setPending(null)}
          onSaved={() => void run(() => Promise.resolve())}
        />
      )}
      {pending?.kind === 'photo' && (
        <PhotoDialog
          hasPhoto={!!pending.member.avatar}
          busy={photoBusy}
          onFile={(file) => void savePhoto(pending.member, file)}
          onRemove={() => void savePhoto(pending.member, null)}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'add' && inviteCode && (
        <AddMemberDialog
          inviteCode={inviteCode}
          onClose={() => setPending(null)}
          onAdded={() => void run(() => Promise.resolve())}
        />
      )}
      {message && (
        <Dialog title={message} onClose={() => setMessage(null)}>
          <Button onClick={() => setMessage(null)}>Entendido</Button>
        </Dialog>
      )}
    </Screen>
  )
}
