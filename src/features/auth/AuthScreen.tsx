import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BackIcon } from '../../components/Icons'
import {
  Button,
  Dialog,
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
import { loginAccount, registerAccount } from './authApi'
import styles from './AuthScreen.module.css'

interface AuthScreenProps {
  mode: 'register' | 'login'
}

// Estado que deja quien manda a la persona a registrarse: a dónde volver.
export interface AuthLocationState {
  from?: string
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as AuthLocationState | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emailHelp, setEmailHelp] = useState(false)
  const registering = mode === 'register'
  const title = registering ? 'Registrarse' : 'Iniciar sesión'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem(null)
    try {
      if (registering) {
        await registerAccount({ username, password, email })
      } else {
        await loginAccount(username, password)
      }
      navigate(from, { replace: true })
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error.message
          : 'Necesitas conexión a Internet para continuar.',
      )
      setBusy(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title={title}
        leading={
          <HeaderIconButton label="Volver" onClick={() => navigate(-1)}>
            <BackIcon />
          </HeaderIconButton>
        }
      />
      <form className={styles.form} onSubmit={handleSubmit}>
        <ScreenContent flush>
          <Section title={registering ? 'Usuario' : 'Usuario o correo'}>
            <div className={styles.field}>
              <TextInput
                aria-label={registering ? 'Usuario' : 'Usuario o correo'}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={100}
                required
              />
            </div>
          </Section>

          <Section title="Contraseña">
            <div className={styles.field}>
              <TextInput
                type="password"
                aria-label="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={registering ? 'new-password' : 'current-password'}
                maxLength={100}
                required
              />
              {registering && (
                <p className={styles.hint}>Usa al menos 8 caracteres.</p>
              )}
            </div>
          </Section>

          {registering && (
            <Section
              title="Correo (opcional)"
              help={{
                label: '¿Para qué sirve el correo?',
                onClick: () => setEmailHelp(true),
              }}
            >
              <div className={styles.field}>
                <TextInput
                  type="email"
                  aria-label="Correo (opcional)"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </div>
            </Section>
          )}

          {problem && (
            <div className={styles.message}>
              <Notice>{problem}</Notice>
            </div>
          )}

          <p className={styles.switch}>
            {registering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <Link
              className={styles.switchLink}
              to={registering ? '/iniciar-sesion' : '/registrarse'}
              state={{ from }}
              replace
            >
              {registering ? 'Iniciar sesión' : 'Registrarse'}
            </Link>
          </p>
        </ScreenContent>

        <ScreenFooter>
          <Button type="submit" variant="inverse" disabled={busy}>
            {title}
          </Button>
        </ScreenFooter>
      </form>
      {emailHelp && (
        <Dialog
          title="El correo sirve para recuperar tu contraseña si la olvidas."
          onClose={() => setEmailHelp(false)}
        >
          <Button onClick={() => setEmailHelp(false)}>Entendido</Button>
        </Dialog>
      )}
    </Screen>
  )
}
