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
import { updateMemberAvatar } from './groupsStorage'
import { MemberStatsFicha, MemberStatsRows } from './MemberStats'
import { useGroup } from './useGroup'
import { computePoints } from '../matches/points'
import styles from './MemberScreen.module.css'

export function MemberScreen() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { group, matches, setGroup } = useGroup(id)
  const [busy, setBusy] = useState(false)
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
        <Section>
          <MemberStatsFicha
            member={member}
            color={colors[member.id]}
            stats={stats}
          />
        </Section>

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

        <Section title="Detalle">
          <MemberStatsRows
            stats={stats}
            members={group.members}
            colors={colors}
          />
        </Section>
      </ScreenContent>
    </Screen>
  )
}
