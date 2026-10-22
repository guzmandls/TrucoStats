import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  HeaderIconButton,
  Notice,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
  TextInput,
} from '../../components/ui'
import { ApiError } from '../../lib/api'
import { requestPasswordReset } from './authApi'
import styles from './AuthScreen.module.css'

// Pedir el enlace para elegir una contraseña nueva. El servidor responde igual
// exista o no la cuenta, así que el aviso no dice si el correo salió.
export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem(null)
    try {
      await requestPasswordReset(identifier)
      setSent(true)
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para continuar.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Recuperar contraseña"
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate(-1)}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      {sent ? (
        <>
          <ScreenContent>
            <Section title="Revisa tu correo">
              <div className={styles.field}>
                <p className={styles.text}>
                  Si existe una cuenta con ese usuario o correo y tiene un
                  correo guardado, te enviamos un enlace para elegir una
                  contraseña nueva. Vale 1 hora. Si no lo ves, mira también la
                  carpeta de spam.
                </p>
                <p className={styles.hint}>
                  Las cuentas que se crearon sin correo no se pueden recuperar.
                </p>
              </div>
            </Section>
          </ScreenContent>
          <ScreenFooter>
            <Button
              variant="inverse"
              onClick={() => navigate('/iniciar-sesion', { replace: true })}
            >
              Volver a iniciar sesión
            </Button>
          </ScreenFooter>
        </>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <ScreenContent>
            <Section title="Usuario o correo">
              <div className={styles.field}>
                <TextInput
                  aria-label="Usuario o correo"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={100}
                  required
                />
                <p className={styles.hint}>
                  Te mandamos un enlace al correo guardado en tu cuenta.
                </p>
              </div>
            </Section>
            {problem && (
              <div className={styles.message}>
                <Notice>{problem}</Notice>
              </div>
            )}
          </ScreenContent>
          <ScreenFooter>
            <Button type="submit" variant="inverse" disabled={busy}>
              Enviar enlace
            </Button>
          </ScreenFooter>
        </form>
      )}
    </Screen>
  )
}
