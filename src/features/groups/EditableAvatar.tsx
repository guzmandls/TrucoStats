import { Avatar } from '../../components/ui'
import { PencilIcon } from '../../components/Icons'
import styles from './EditableAvatar.module.css'

interface EditableAvatarProps {
  name: string
  color: string
  src?: string
  size: number
  onEdit: () => void
}

// La foto de una persona como botón: al tocarla se abre la edición. Una insignia
// con un lápiz avisa que se puede editar.
export function EditableAvatar({
  name,
  color,
  src,
  size,
  onEdit,
}: EditableAvatarProps) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label="Editar foto"
      onClick={onEdit}
    >
      <Avatar name={name} color={color} src={src} size={size} />
      <span className={styles.badge} aria-hidden="true">
        <PencilIcon size={14} />
      </span>
    </button>
  )
}
