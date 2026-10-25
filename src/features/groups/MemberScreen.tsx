import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  Dialog,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
} from '../../components/ui'
import { memberStats } from '../matches/groupStats'
import { avatarColors } from './avatar'
import { fileToAvatarDataUrl, UNREADABLE_IMAGE } from './imageFile'
import { loadGroups, updateMemberAvatar } from './groupsStorage'
import { applyMyPhoto } from '../profile/myPhoto'
import { MemberStatsFicha, MemberStatsRows } from './MemberStats'
import { shareAvatar } from './avatarSync'
import { isGroupAdmin } from './groupAdmin'
import { PhotoDialog } from './PhotoDialog'
import { useGroup } from './useGroup'
import { computePoints } from '../matches/points'
import styles from './MemberScreen.module.css'

export function MemberScreen() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { group, matches, setGroup } = useGroup(id)
  const [busy, setBusy] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const member = group?.members.find((item) => item.id === memberId) ?? null
  const memberPoints = useMemo(() => {
    if (!group || !matches || !member) {
      return null
    }
    const map = computePoints(
      group.members.map((item) => item.id),
      matches,
    )
    return map.get(member.id) ?? 0
  }, [group, matches, member])

  useEffect(() => {
    if (group && !member) {
      navigate(`/grupo/${group.id}/participantes`, { replace: true })
    }
  }, [group, member, navigate])

  if (!group || !matches || !member) {
    return (
      <Screen>
        <PageHeader
          title="Participante"
          leading={
            <HeaderIconButton
              label="Volver"
              onClick={() => navigate(`/grupo/${id}/participantes`)}
            >
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  // Cada uno cambia su foto y los administradores, la de cualquiera (el servidor
  // lo comprueba). En un grupo que todavía está solo en este celular, cualquiera.
  const canEditPhoto =
    !group.inviteCode || member.id === group.myMemberId || isGroupAdmin(group)
  const stats = memberStats(member, matches)
  const colors = avatarColors(group.members.map((item) => item.id))

  async function handleFile(file: File | undefined) {
    if (!file || !group) {
      return
    }
    setBusy(true)
    try {
      let dataUrl: string
      try {
        dataUrl = await fileToAvatarDataUrl(file)
      } catch {
        setPhotoMessage(UNREADABLE_IMAGE)
        return
      }
      await savePhoto(dataUrl)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!group) {
      return
    }
    await savePhoto(undefined)
  }

  // Tu foto es la de tu cuenta: se cambia en todos tus grupos. La de un
  // integrante que nadie eligió (la pone un administrador) es solo de este grupo.
  async function savePhoto(dataUrl: string | undefined) {
    if (!group) {
      return
    }
    if (member!.id === group.myMemberId) {
      const result = await applyMyPhoto(await loadGroups(), dataUrl)
      const updated = result.groups.find((item) => item.id === group.id)
      if (updated) {
        setGroup(updated)
      }
      setPhotoMessage(result.problem)
      return
    }
    const updated = await updateMemberAvatar(group, member!.id, dataUrl)
    setGroup(updated)
    setPhotoMessage(await shareAvatar(updated, member!.id, dataUrl ?? null))
  }

  return (
    <Screen>
      <PageHeader
        title={member.name}
        center={
          memberPoints === null ? undefined : (
            <span className={styles.headerPoints}>{memberPoints} Pts</span>
          )
        }
        leading={
          <HeaderIconButton
            label="Volver"
            onClick={() => navigate(`/grupo/${group.id}/participantes`)}
          >
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent flush>
        <MemberStatsFicha
          member={member}
          color={colors[member.id]}
          stats={stats}
          onEditPhoto={canEditPhoto ? () => setEditingPhoto(true) : undefined}
        />

        {(member.aliases ?? []).length > 0 && (
          <Section title="Apodos">
            <div className={styles.aliases}>
              <ul className={styles.aliasList}>
                {(member.aliases ?? []).map((alias) => (
                  <li key={alias} className={styles.alias}>
                    {alias}
                  </li>
                ))}
              </ul>
              <p className={styles.aliasHelp}>
                Las partidas en las que anotaron a un invitado con alguno de
                estos nombres cuentan para este integrante.
              </p>
            </div>
          </Section>
        )}

        <Section title="Detalle">
          <MemberStatsRows
            stats={stats}
            members={group.members}
            colors={colors}
          />
        </Section>
      </ScreenContent>
      {photoMessage && (
        <Dialog title={photoMessage} onClose={() => setPhotoMessage(null)}>
          <Button onClick={() => setPhotoMessage(null)}>Entendido</Button>
        </Dialog>
      )}
      {editingPhoto && (
        <PhotoDialog
          hasPhoto={!!member.avatar}
          busy={busy}
          onFile={(file) => {
            void handleFile(file).then(() => setEditingPhoto(false))
          }}
          onRemove={() => {
            void handleRemove().then(() => setEditingPhoto(false))
          }}
          onClose={() => setEditingPhoto(false)}
        />
      )}
    </Screen>
  )
}
