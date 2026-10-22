import { useEffect, useState } from 'react'
import { Button, Notice, Section, TextInput } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { isRegistered, useSession } from '../../lib/session'
import { refreshAccount, requestEmailChange } from '../auth/authApi'
import styles from './EmailSection.module.css'

// El correo de la cuenta sirve para recuperar la contraseña. Para guardar uno
// nuevo se manda un enlace de confirmación a esa dirección: hasta que se abre,
// el correo de la cuenta no cambia.
export function EmailSection() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const registered = isRegistered(session)

  // El correo pudo confirmarse desde otro navegador (por ejemplo, el de la app
  // de correo): al abrir el perfil y al volver a la app se pide el dato actual.
  useEffect(() => {
    if (!registered) {
      return
    }
    void refreshAccount()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshAccount()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [registered])

  if (!session || !registered) {
    return null
  }
  const current = session.user.email

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setProblem(null)
    setSentTo(null)
    try {
      await requestEmailChange(email.trim())
      setSentTo(email.trim())
      setEmail('')
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
    <Section title="Correo">
      <form className={styles.field} onSubmit={handleSubmit}>
        <p className={styles.text}>
          {current
            ? `Tu correo: ${current}`
            : 'No tienes un correo guardado. Guárdalo para poder recuperar tu contraseña si la olvidas.'}
        </p>
        <TextInput
          type="email"
          aria-label={current ? 'Correo nuevo' : 'Correo'}
          placeholder={current ? 'Correo nuevo' : 'tucorreo@ejemplo.com'}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          maxLength={100}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || email.trim() === ''}
        >
          Enviar enlace de confirmación
        </Button>
        {sentTo && (
          <p className={styles.text} role="status">
            Te enviamos un enlace a {sentTo}. Ábrelo para confirmar el correo;
            hasta entonces no cambia nada.
          </p>
        )}
        {problem && <Notice>{problem}</Notice>}
      </form>
    </Section>
  )
}
