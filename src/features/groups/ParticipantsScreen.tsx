import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackIcon, ChevronRightIcon } from '../../components/Icons'
import {
  Avatar,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
} from '../../components/ui'
import { avatarColors } from './avatar'
import { useGroup } from './useGroup'
import styles from './ParticipantsScreen.module.css'

export function ParticipantsScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { group } = useGroup(id)

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
      />
      <ScreenContent>
        <div className={styles.list}>
          {group.members.map((member) => (
            <Link
              key={member.id}
              to={`/grupo/${group.id}/participantes/${member.id}`}
              className={styles.member}
            >
              <Avatar
                name={member.name}
                color={colors[member.id]}
                src={member.avatar}
                size={48}
              />
              <span className={styles.memberName}>{member.name}</span>
              <span className={styles.go}>
                <ChevronRightIcon size={24} />
              </span>
            </Link>
          ))}
        </div>
      </ScreenContent>
    </Screen>
  )
}
