import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui'
import { isRegistered, useSession, useSessionExpired } from '../../lib/session'
import { myPhoto } from '../profile/myPhoto'
import type { Group } from './types'
import styles from './AccountBadge.module.css'

// En la barra del inicio, a la vista: con la sesión iniciada, tu foto (o tu
// silueta), que abre el perfil; sin sesión (o vencida), "Entrar".
export function AccountBadge({ groups }: { groups: Group[] }) {
  const session = useSession()
  const expired = useSessionExpired()

  if (!session || !isRegistered(session) || expired) {
    return (
      <Link to="/iniciar-sesion" className={styles.enter}>
        Entrar
      </Link>
    )
  }
  const photo = myPhoto(groups)
  const name = session.user.username ?? session.user.name
  return (
    <Link
      to="/perfil"
      className={styles.photo}
      aria-label={`Perfil de ${name}`}
      title={name}
    >
      <Avatar
        name={name}
        color={photo?.color ?? 'var(--ink-muted)'}
        src={photo?.src}
        size={34}
      />
    </Link>
  )
}
