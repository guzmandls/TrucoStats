import { deleteRequest, postJson } from '../../lib/api'
import { clearAccountData, restoreAccountGroups } from '../groups/accountData'
import { clearSession, saveSession, type Session } from '../../lib/session'

// Crea la cuenta y deja la sesión iniciada. Si la persona tenía una cuenta
// invitada, el servidor la convierte en esta (el pedido ya lleva su token).
export async function registerAccount(fields: {
  username: string
  password: string
  email: string
}): Promise<void> {
  const session = await postJson<Session>('/api/registro', {
    username: fields.username,
    password: fields.password,
    email: fields.email.trim() === '' ? undefined : fields.email,
  })
  saveSession(session)
  await restoreAccountGroups()
}

export async function loginAccount(
  identifier: string,
  password: string,
): Promise<void> {
  saveSession(await postJson<Session>('/api/sesion', { identifier, password }))
  await restoreAccountGroups()
}

// Cierra la sesión en el servidor si hay conexión; en este celular se cierra
// siempre.
export async function logoutAccount(): Promise<void> {
  try {
    await deleteRequest('/api/sesion')
  } catch {
    // Sin conexión: el token queda sin usar y vence solo.
  }
  clearSession()
  await clearAccountData()
}
