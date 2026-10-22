import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  EmptyNote,
  Notice,
  PageHeader,
  Screen,
  ScreenContent,
  ScreenFooter,
  Section,
} from '../../components/ui'
import { ApiError } from '../../lib/api'
import { confirmEmail } from './authApi'
import styles from './AuthScreen.module.css'

type Status = 'loading' | 'done' | 'error'

// Abre el enlace que llegó por correo para confirmar el correo de la cuenta.
export function ConfirmEmailScreen() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState('')
  // El enlace es de un solo uso: aunque el efecto se ejecute dos veces (modo
  // desarrollo), se confirma una vez.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }
    started.current = true
    confirmEmail(token).then(
      (confirmed) => {
        setEmail(confirmed)
        setStatus('done')
      },
      (error: unknown) => {
        setProblem(
          error instanceof ApiError
            ? error.message
            : 'Necesitas conexión a Internet para confirmar el correo.',
        )
        setStatus('error')
      },
    )
  }, [token])

  return (
    <Screen>
      <PageHeader title="Confirmar correo" />
      <ScreenContent>
        {status === 'loading' && <EmptyNote>Confirmando tu correo…</EmptyNote>}
        {status === 'done' && (
          <Section title="Correo confirmado">
            <div className={styles.field}>
              <p className={styles.text}>
                Tu correo ahora es <strong>{email}</strong>. Ya sirve para
                recuperar tu contraseña.
              </p>
            </div>
          </Section>
        )}
        {status === 'error' && (
          <div className={styles.message}>
            <Notice>{problem}</Notice>
          </div>
        )}
      </ScreenContent>
      <ScreenFooter>
        <Button
          variant="inverse"
          onClick={() => navigate('/', { replace: true })}
        >
          Ir al inicio
        </Button>
      </ScreenFooter>
    </Screen>
  )
}
