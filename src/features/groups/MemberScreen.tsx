import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
} from '../../components/ui'
import { memberStats } from '../matches/groupStats'
import { avatarColors } from './avatar'
import { fileToAvatarDataUrl } from './imageFile'
import { setRemoteAvatar } from './groupsApi'
import { updateMemberAvatar } from './groupsStorage'
import { MemberStatsFicha, MemberStatsRows } from './MemberStats'
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
      const dataUrl = await fileToAvatarDataUrl(file)
      const updated = await updateMemberAvatar(group, member!.id, dataUrl)
      setGroup(updated)
      shareAvatar(dataUrl)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!group) {
      return
    }
    const updated = await updateMemberAvatar(group, member!.id, undefined)
    setGroup(updated)
    shareAvatar(null)
  }

  // Aviso al servidor para que los demás celulares vean la foto. Si no hay
  // conexión, el cambio queda solo en este celular.
  function shareAvatar(avatar: string | null) {
    if (group?.inviteCode) {
      void setRemoteAvatar(group.inviteCode, member!.id, avatar).catch(
        () => undefined,
      )
    }
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
      <ScreenContent>
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
