import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Notice,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  TextInput,
} from '../../components/ui'
import { ApiError } from '../../lib/api'
import { resetPassword } from './authApi'
import styles from './AuthScreen.module.css'

// Elegir la contraseña nueva con el enlace que llegó por correo. Al terminar
// queda la sesión iniciada.
export function ResetPasswordScreen() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [repeated, setRepeated] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [invalidLink, setInvalidLink] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== repeated) {
      setProblem('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      await resetPassword(token, password)
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        // Una contraseña corta no gasta el enlace; uno vencido o usado, sí.
        setInvalidLink(/enlace/i.test(error.message))
        setProblem(error.message)
      } else {
        setProblem(
          error instanceof ApiError
            ? error.message
            : 'Necesitas conexión a Internet para continuar.',
        )
      }
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader title="Contraseña nueva" />
      <form className={styles.form} onSubmit={handleSubmit}>
        <ScreenContent>
          <Section title="Contraseña nueva">
            <div className={styles.field}>
              <TextInput
                type="password"
                aria-label="Contraseña nueva"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                maxLength={100}
                required
              />
              <p className={styles.hint}>Usa al menos 8 caracteres.</p>
            </div>
          </Section>
          <Section title="Repetir contraseña">
            <div className={styles.field}>
              <TextInput
                type="password"
                aria-label="Repetir contraseña"
                value={repeated}
                onChange={(event) => setRepeated(event.target.value)}
                autoComplete="new-password"
                maxLength={100}
                required
              />
            </div>
          </Section>
          {problem && (
            <div className={styles.message}>
              <Notice>{problem}</Notice>
            </div>
          )}
          {invalidLink && (
            <div className={styles.message}>
              <Button
                variant="secondary"
                onClick={() => navigate('/recuperar', { replace: true })}
              >
                Pedir otro enlace
              </Button>
            </div>
          )}
        </ScreenContent>
        <ScreenFooter>
          <Button type="submit" variant="inverse" disabled={busy}>
            Guardar contraseña
          </Button>
        </ScreenFooter>
      </form>
    </Screen>
  )
}
