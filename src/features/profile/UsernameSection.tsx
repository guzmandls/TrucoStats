import { useState } from 'react'
import { Button, Notice, Section, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { isRegistered, useSession } from '../../lib/session'
import { changeUsername } from '../auth/authApi'
import styles from './EmailSection.module.css'

// El usuario con el que se inicia sesión. Se puede cambiar con la sesión
// iniciada (sin contraseña, como el correo). Necesita conexión.
export function UsernameSection() {
  const session = useSession()
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [changed, setChanged] = useState<string | null>(null)

  if (!session || !isRegistered(session)) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem(null)
    setChanged(null)
    try {
      setChanged(await changeUsername(username.trim()))
      setUsername('')
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para hacerlo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Usuario">
      <form className={styles.field} onSubmit={handleSubmit}>
        <p className={styles.text}>
          Tu usuario: <strong>{session.user.username}</strong>
        </p>
        <TextInput
          aria-label="Usuario nuevo"
          placeholder="Usuario nuevo"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || username.trim() === ''}
        >
          Cambiar usuario
        </Button>
        {changed && (
          <p className={styles.text} role="status">
            Listo: ahora inicias sesión con {changed}.
          </p>
        )}
        {problem && <Notice>{problem}</Notice>}
      </form>
    </Section>
  )
}
