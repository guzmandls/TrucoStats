import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackIcon, PencilIcon } from '../../components/Icons'
import {
  HeaderIconButton,
  Notice,
  PageHeader,
  Screen,
  ScreenContent,
  Section,
  StatRow,
} from '../../components/ui'
import { avatarColors } from '../groups/avatar'
import { fetchMemberProfile } from '../groups/groupsApi'
import { loadGroups } from '../groups/groupsStorage'
import { MemberStatsRows } from '../groups/MemberStats'
import { useGroup } from '../groups/useGroup'
import { memberStats } from '../matches/groupStats'
import { loadMatches } from '../matches/matchesStorage'
import { computePoints } from '../matches/points'
import { pullQuickMatches } from '../matches/quickSync'
import { personalSummary } from '../matches/stats'
import { activeMatches } from '../matches/status'
import { myMatches } from './myMatches'
import { ProfileView, type Personal } from './ProfileView'
import styles from './ProfileScreen.module.css'

type PersonalState = Personal | null | 'loading' | 'offline'

// El perfil de un integrante abierto desde un grupo: la misma página que el
// perfil del inicio (foto y estadísticas personales, que ven todos) más sus
// estadísticas en este grupo. Solo en el propio se puede editar.
export function MemberProfileScreen() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { group, matches } = useGroup(id)
  const member = group?.members.find((item) => item.id === memberId) ?? null
  const isMe = !!group && group.myMemberId === memberId
  const [personal, setPersonal] = useState<PersonalState>('loading')

  useEffect(() => {
    if (group && !member) {
      navigate(`/grupo/${group.id}/participantes`, { replace: true })
    }
  }, [group, member, navigate])

  // Las tuyas se calculan en el celular; las de los demás las da el servidor
  // (suman sus partidas rápidas y las de todos sus grupos).
  const inviteCode = group?.inviteCode
  useEffect(() => {
    if (!group || !memberId) {
      return
    }
    let active = true
    if (isMe) {
      const load = () =>
        Promise.all([loadMatches(), loadGroups()]).then(([all, groups]) => {
          if (active) {
            setPersonal({
              ...personalSummary(myMatches(activeMatches(all), groups)),
              groups: groups.length,
            })
          }
        })
      void load()
      void pullQuickMatches().then(load)
    } else if (inviteCode) {
      fetchMemberProfile(inviteCode, memberId)
        .then((value) => {
          if (active) {
            setPersonal(value)
          }
        })
        .catch(() => {
          if (active) {
            setPersonal('offline')
          }
        })
    }
    return () => {
      active = false
    }
  }, [group, inviteCode, isMe, memberId])

  const points = useMemo(() => {
    if (!group || !matches || !member) {
      return null
    }
    return (
      computePoints(
        group.members.map((item) => item.id),
        matches,
      ).get(member.id) ?? 0
    )
  }, [group, matches, member])

  const back = () => {
    if (
      typeof window.history.state?.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate(`/grupo/${id}/participantes`)
    }
  }
  const edit = () => navigate('/perfil/editar')

  if (!group || !matches || !member) {
    return (
      <Screen>
        <PageHeader
          title="Perfil"
          leading={
            <HeaderIconButton label="Volver" onClick={back}>
              <BackIcon />
            </HeaderIconButton>
          }
        />
        <ScreenContent>{null}</ScreenContent>
      </Screen>
    )
  }

  const colors = avatarColors(group.members.map((item) => item.id))
  const stats = memberStats(member, matches)
  // En un grupo que no está en el servidor, solo se conocen las tuyas.
  const shown: PersonalState = !isMe && !inviteCode ? null : personal

  return (
    <Screen>
      <PageHeader
        title={member.name}
        center={
          points === null ? undefined : (
            <span className={styles.headerPoints}>{points} Pts</span>
          )
        }
        leading={
          <HeaderIconButton label="Volver" onClick={back}>
            <BackIcon />
          </HeaderIconButton>
        }
        trailing={
          isMe ? (
            <HeaderIconButton label="Editar perfil" onClick={edit}>
              <PencilIcon />
            </HeaderIconButton>
          ) : undefined
        }
      />
      <ScreenContent flush>
        <ProfileView
          photo={{
            name: member.name,
            color: colors[member.id],
            src: member.avatar,
          }}
          onPhoto={isMe ? edit : undefined}
          personal={shown === 'loading' || shown === 'offline' ? null : shown}
        >
          {shown === 'offline' && (
            <div className={styles.notice}>
              <Notice>
                Necesitas conexión para ver sus estadísticas personales.
              </Notice>
            </div>
          )}
          <Section title={`Estadísticas en “${group.name}”`}>
            <StatRow label="Jugadas" value={stats.played} />
            <StatRow label="Victorias" value={stats.wins} />
            <StatRow
              label="Porcentaje de victorias"
              value={stats.winRate === null ? '—' : `${stats.winRate}%`}
            />
            <MemberStatsRows
              stats={stats}
              members={group.members}
              colors={colors}
            />
          </Section>
        </ProfileView>
      </ScreenContent>
    </Screen>
  )
}
