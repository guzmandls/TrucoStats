import { useState } from 'react'
import { Button, Notice, Section, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { isRegistered, useSession } from '../../lib/session'
import { changePassword } from '../auth/authApi'
import styles from './EmailSection.module.css'

// Cambiar la contraseña con la sesión iniciada. Pide la actual (por si el
// celular quedó en otras manos) y la nueva dos veces. Necesita conexión.
export function PasswordSection() {
  const session = useSession()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!session || !isRegistered(session)) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setDone(false)
    if (password !== repeat) {
      setProblem('Las contraseñas nuevas no coinciden.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      await changePassword(current, password)
      setDone(true)
      setCurrent('')
      setPassword('')
      setRepeat('')
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
    <Section title="Contraseña">
      <form className={styles.field} onSubmit={handleSubmit}>
        <TextInput
          type="password"
          aria-label="Contraseña actual"
          placeholder="Contraseña actual"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          autoComplete="current-password"
          maxLength={100}
        />
        <TextInput
          type="password"
          aria-label="Contraseña nueva"
          placeholder="Contraseña nueva (8 caracteres o más)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          maxLength={100}
        />
        <TextInput
          type="password"
          aria-label="Repetir contraseña nueva"
          placeholder="Repetir contraseña nueva"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          autoComplete="new-password"
          maxLength={100}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || current === '' || password === '' || repeat === ''}
        >
          Cambiar contraseña
        </Button>
        {done && (
          <p className={styles.text} role="status">
            Tu contraseña cambió. Se cerró la sesión en los demás celulares.
          </p>
        )}
        {problem && <Notice>{problem}</Notice>}
      </form>
    </Section>
  )
}
