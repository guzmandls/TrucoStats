import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Notice, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { isRegistered, useSession } from '../../lib/session'
import { deleteAccount } from '../auth/authApi'
import { countUnsentGroupMatches } from '../groups/accountData'
import styles from './EmailSection.module.css'

// Botón "Eliminar cuenta", al final del perfil. Pide la contraseña para evitar
// borrados por error o desde un celular prestado.
export function DeleteAccount() {
  const session = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [unsent, setUnsent] = useState(0)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  if (!session || !isRegistered(session)) {
    return null
  }

  const start = async () => {
    setUnsent(await countUnsentGroupMatches())
    setPassword('')
    setProblem(null)
    setOpen(true)
  }

  const confirm = async () => {
    setBusy(true)
    setProblem(null)
    try {
      await deleteAccount(password)
      navigate('/', { replace: true })
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para eliminar la cuenta.',
      )
      setBusy(false)
    }
  }

  return (
    <div className={styles.field}>
      <Button variant="secondary" onClick={() => void start()}>
        Eliminar cuenta
      </Button>
      {open && (
        <Dialog
          title="¿Eliminar tu cuenta?"
          onClose={() => setOpen(false)}
          closeButton
        >
          <p>
            Saldrás de todos tus grupos. Tus partidas seguirán en el historial
            de cada grupo. No se puede deshacer.
            {unsent > 0 &&
              ` Tienes ${unsent === 1 ? '1 partida' : `${unsent} partidas`} de grupo sin enviar: se perderán.`}
          </p>
          <TextInput
            type="password"
            aria-label="Contraseña"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            maxLength={100}
          />
          {problem && <Notice>{problem}</Notice>}
          <Button
            disabled={busy || password === ''}
            onClick={() => void confirm()}
          >
            Eliminar cuenta
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </Dialog>
      )}
    </div>
  )
}
