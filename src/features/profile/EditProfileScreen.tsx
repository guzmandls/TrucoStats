import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Avatar,
  Button,
  Dialog,
  EmptyNote,
  HeaderIconButton,
  PageHeader,
  Screen,
  ScreenContent,
} from '../../components/ui'
import { isRegistered, useSession } from '../../lib/session'
import { fileToAvatarDataUrl, UNREADABLE_IMAGE } from '../groups/imageFile'
import { loadGroups } from '../groups/groupsStorage'
import { PhotoDialog } from '../groups/PhotoDialog'
import type { Group } from '../groups/types'
import { DeleteAccount } from './DeleteAccount'
import { EmailSection } from './EmailSection'
import { applyMyPhoto, myPhoto } from './myPhoto'
import { PasswordSection } from './PasswordSection'
import { PhotoViewer } from './PhotoViewer'
import { UsernameSection } from './UsernameSection'
import styles from './EditProfile.module.css'

// Editar perfil: la foto y los datos de la cuenta (usuario, correo, contraseña)
// y, al final, eliminar la cuenta. Se llega desde el lápiz del perfil o tocando
// la foto.
export function EditProfileScreen() {
  const navigate = useNavigate()
  const session = useSession()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void loadGroups().then((loaded) => {
      if (active) {
        setGroups(loaded)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const photo = groups ? myPhoto(groups) : null

  async function applyPhoto(dataUrl: string | undefined) {
    if (!groups) {
      return
    }
    setBusy(true)
    try {
      const result = await applyMyPhoto(groups, dataUrl)
      setGroups(result.groups)
      if (result.problem) {
        setPhotoMessage(result.problem)
      }
      setEditingPhoto(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Editar perfil"
        leading={
          <HeaderIconButton
            label="Volver"
            onClick={() =>
              typeof window.history.state?.idx === 'number' &&
              window.history.state.idx > 0
                ? navigate(-1)
                : navigate('/perfil')
            }
          >
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <ScreenContent flush>
        {photo && (
          <div className={styles.photo}>
            <button
              type="button"
              className={styles.photoButton}
              aria-label={photo.src ? 'Ver foto' : 'Elegir foto'}
              onClick={() =>
                photo.src ? setViewing(true) : setEditingPhoto(true)
              }
            >
              <Avatar
                name={photo.name}
                color={photo.color}
                src={photo.src}
                size={112}
              />
            </button>
            <Button variant="secondary" onClick={() => setEditingPhoto(true)}>
              {photo.src ? 'Cambiar foto' : 'Agregar foto'}
            </Button>
          </div>
        )}
        {groups && !photo && !isRegistered(session) && (
          <EmptyNote>
            Inicia sesión o únete a un grupo para editar tu perfil
          </EmptyNote>
        )}
        <UsernameSection />
        <EmailSection />
        <PasswordSection />
        <DeleteAccount />
      </ScreenContent>
      {viewing && photo?.src && (
        <PhotoViewer
          src={photo.src}
          alt={photo.name}
          onClose={() => setViewing(false)}
        />
      )}
      {photoMessage && (
        <Dialog title={photoMessage} onClose={() => setPhotoMessage(null)}>
          <Button onClick={() => setPhotoMessage(null)}>Entendido</Button>
        </Dialog>
      )}
      {editingPhoto && (
        <PhotoDialog
          hasPhoto={!!photo?.src}
          busy={busy}
          onFile={(file) => {
            void fileToAvatarDataUrl(file).then(
              (dataUrl) => applyPhoto(dataUrl),
              () => {
                setEditingPhoto(false)
                setPhotoMessage(UNREADABLE_IMAGE)
              },
            )
          }}
          onRemove={() => void applyPhoto(undefined)}
          onClose={() => setEditingPhoto(false)}
        />
      )}
    </Screen>
  )
}
