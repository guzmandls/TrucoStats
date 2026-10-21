import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  EmptyNote,
  Figure,
  Figures,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  StatRow,
  WinRateRing,
} from '../../components/ui'
import { avatarColors } from '../groups/avatar'
import { EditableAvatar } from '../groups/EditableAvatar'
import { fileToAvatarDataUrl } from '../groups/imageFile'
import { setRemoteAvatar } from '../groups/groupsApi'
import { loadGroups, updateMemberAvatar } from '../groups/groupsStorage'
import { PhotoDialog } from '../groups/PhotoDialog'
import type { Group } from '../groups/types'
import { loadMatches } from '../matches/matchesStorage'
import { activeMatches } from '../matches/status'
import { formatDuration, personalSummary } from '../matches/stats'
import type { Match } from '../matches/types'
import { winRateColor } from '../matches/winRateColor'
import styles from './ProfileScreen.module.css'

function percent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function duration(value: number | null): string {
  return value === null ? '—' : formatDuration(value)
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [busy, setBusy] = useState(false)
  const groupCount = groups.length

  useEffect(() => {
    let active = true
    void Promise.all([loadMatches(), loadGroups()]).then(([all, groups]) => {
      if (!active) {
        return
      }
      setMatches(all)
      setGroups(groups)
    })
    return () => {
      active = false
    }
  }, [])

  const summary = matches ? personalSummary(activeMatches(matches)) : null

  // Tu foto es la de tu integrante en cada grupo donde ya sabemos quién eres:
  // cambiarla desde el perfil la cambia en todos.
  const mine = groups.flatMap((group) => {
    const member = group.members.find((item) => item.id === group.myMemberId)
    return member ? [{ group, member }] : []
  })
  const first = mine[0]
  const currentAvatar = mine.find((item) => item.member.avatar)?.member.avatar

  async function applyPhoto(dataUrl: string | undefined) {
    setBusy(true)
    try {
      const updated: Group[] = []
      for (const { group, member } of mine) {
        updated.push(await updateMemberAvatar(group, member.id, dataUrl))
        if (group.inviteCode) {
          // Si no hay conexión, el cambio queda solo en este celular.
          void setRemoteAvatar(
            group.inviteCode,
            member.id,
            dataUrl ?? null,
          ).catch(() => undefined)
        }
      }
      setGroups((previous) =>
        previous.map(
          (group) => updated.find((item) => item.id === group.id) ?? group,
        ),
      )
      setEditingPhoto(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Perfil"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate('/')}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent>
        {first && (
          <div className={styles.photo}>
            <EditableAvatar
              name={first.member.name}
              color={
                avatarColors(first.group.members.map((item) => item.id))[
                  first.member.id
                ]
              }
              src={currentAvatar}
              size={88}
              onEdit={() => setEditingPhoto(true)}
            />
          </div>
        )}

        {summary && summary.total === 0 ? (
          <EmptyNote>Todavía no jugaste ninguna partida</EmptyNote>
        ) : null}

        {summary && summary.total > 0 && (
          <>
            <div className={styles.hero}>
              <WinRateRing
                percent={summary.winRate ?? 0}
                color={
                  summary.winRate === null
                    ? 'var(--line-strong)'
                    : winRateColor(summary.winRate)
                }
                size={92}
              />
              <Figures>
                <Figure value={summary.wins} label="victorias" />
                <Figure value={summary.total} label="jugadas" />
              </Figures>
            </div>

            <Section title="Resumen">
              <StatRow label="Derrotas" value={summary.losses} />
              <StatRow
                label="Duración promedio"
                value={duration(summary.averageDurationSeconds)}
              />
              <StatRow label="Grupos" value={groupCount} />
            </Section>

            <Section title="Partidas rápidas">
              <StatRow label="Jugadas" value={summary.quick.total} />
              <StatRow label="Victorias" value={summary.quick.wins} />
              <StatRow
                label="Porcentaje de victorias"
                value={percent(summary.quick.winRate)}
              />
            </Section>

            <Section title="Partidas de grupo">
              <StatRow label="Jugadas" value={summary.group.total} />
              <StatRow label="Victorias" value={summary.group.wins} />
              <StatRow
                label="Porcentaje de victorias"
                value={percent(summary.group.winRate)}
              />
            </Section>
          </>
        )}
      </ScreenContent>
      {editingPhoto && (
        <PhotoDialog
          hasPhoto={!!currentAvatar}
          busy={busy}
          onFile={(file) => {
            void fileToAvatarDataUrl(file).then((dataUrl) =>
              applyPhoto(dataUrl),
            )
          }}
          onRemove={() => void applyPhoto(undefined)}
          onClose={() => setEditingPhoto(false)}
        />
      )}
    </Screen>
  )
}
