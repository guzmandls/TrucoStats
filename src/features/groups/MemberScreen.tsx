import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
} from '../../components/ui'
import { memberStats } from '../matches/groupStats'
import { avatarColors } from './avatar'
import { fileToAvatarDataUrl } from './imageFile'
import { fetchGroupByCode, setRemoteAvatar } from './groupsApi'
import { RenameMemberDialog } from './RenameMemberDialog'
import { updateMemberAvatar } from './groupsStorage'
import { MemberStatsFicha, MemberStatsRows } from './MemberStats'
import { AliasesDialog } from './AliasesDialog'
import { isGroupAdmin } from './groupAdmin'
import { pullGroup } from './groupsSync'
import { useGroup } from './useGroup'
import { computePoints } from '../matches/points'
import styles from './MemberScreen.module.css'

export function MemberScreen() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { group, matches, setGroup, reload } = useGroup(id)
  const [busy, setBusy] = useState(false)
  const [editingAliases, setEditingAliases] = useState(false)
  const [renaming, setRenaming] = useState(false)
  // Qué integrantes ya eligió una persona (solo se consulta si soy administrador).
  const [claimed, setClaimed] = useState<string[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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

  const inviteCode = group?.inviteCode
  const admin = group ? isGroupAdmin(group) : false
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
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [admin, inviteCode])

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

  // Cada uno cambia su propio nombre; el administrador solo el de quien nadie
  // eligió todavía.
  const canRename =
    !!group.inviteCode &&
    (member.id === group.myMemberId ||
      (admin && claimed !== null && !claimed.includes(member.id)))
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
        />

        {canRename && (
          <Section title="Nombre">
            <div className={styles.photoActions}>
              <Button variant="secondary" onClick={() => setRenaming(true)}>
                Cambiar nombre
              </Button>
            </div>
          </Section>
        )}

        <Section title="Foto">
          <div className={styles.photoActions}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              aria-label="Elige foto"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {member.avatar ? 'Cambiar foto' : 'Elige foto'}
            </Button>
            {member.avatar && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={handleRemove}
              >
                Quitar foto
              </Button>
            )}
          </div>
        </Section>

        <Section title="Apodos">
          <div className={styles.aliases}>
            {(member.aliases ?? []).length > 0 ? (
              <ul className={styles.aliasList}>
                {(member.aliases ?? []).map((alias) => (
                  <li key={alias} className={styles.alias}>
                    {alias}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.aliasHelp}>Sin apodos</p>
            )}
            <p className={styles.aliasHelp}>
              Las partidas en las que anotaron a un invitado con alguno de estos
              nombres cuentan para este integrante.
            </p>
            {group.inviteCode &&
              (isGroupAdmin(group) || member.id === group.myMemberId) && (
                <Button
                  variant="secondary"
                  onClick={() => setEditingAliases(true)}
                >
                  Editar apodos
                </Button>
              )}
          </div>
        </Section>

        <Section title="Detalle">
          <MemberStatsRows
            stats={stats}
            members={group.members}
            colors={colors}
          />
        </Section>
      </ScreenContent>
      {renaming && group.inviteCode && (
        <RenameMemberDialog
          inviteCode={group.inviteCode}
          memberId={member.id}
          currentName={member.name}
          onClose={() => setRenaming(false)}
          onSaved={() => {
            setRenaming(false)
            void pullGroup(group.id).then(reload)
          }}
        />
      )}
      {editingAliases && group.inviteCode && (
        <AliasesDialog
          inviteCode={group.inviteCode}
          memberId={member.id}
          memberName={member.name}
          aliases={member.aliases ?? []}
          onClose={() => setEditingAliases(false)}
          onSaved={() => {
            setEditingAliases(false)
            void pullGroup(group.id).then(reload)
          }}
        />
      )}
    </Screen>
  )
}
