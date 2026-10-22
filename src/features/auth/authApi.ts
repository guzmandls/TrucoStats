import { apiRequest, deleteRequest, postJson } from '../../lib/api'
import { clearAccountData, restoreAccountGroups } from '../groups/accountData'
import {
  clearSession,
  getSession,
  saveSession,
  type Account,
  type Session,
} from '../../lib/session'

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

// Pide un correo con el enlace para elegir una contraseña nueva. La respuesta es
// siempre la misma, exista o no la cuenta: no se sabe si el correo salió.
export async function requestPasswordReset(identifier: string): Promise<void> {
  await postJson('/api/recuperar', { identifier })
}

// Elige la contraseña nueva con el enlace del correo: deja la sesión iniciada y
// trae de nuevo los grupos de la cuenta.
export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  saveSession(await postJson<Session>('/api/restablecer', { token, password }))
  await restoreAccountGroups()
}

// Cambia la contraseña con la sesión iniciada (pide la actual). Este celular
// sigue con la sesión; en los demás se cierra.
export async function changePassword(
  current: string,
  password: string,
): Promise<void> {
  await postJson('/api/contrasena', { current, password })
}

// Cambia el usuario con el que se inicia sesión y lo actualiza en este celular.
export async function changeUsername(username: string): Promise<string> {
  const { user } = await postJson<{ user: Account }>('/api/usuario', {
    username,
  })
  const session = getSession()
  if (session && session.user.id === user.id) {
    saveSession({
      ...session,
      user: { ...session.user, username: user.username },
    })
  }
  return user.username ?? username
}

// Elimina la cuenta (pide la contraseña). Después, como al cerrar sesión, se
// quitan de este celular los grupos y las partidas de grupo de la cuenta.
export async function deleteAccount(password: string): Promise<void> {
  await postJson('/api/eliminar-cuenta', { password })
  clearSession()
  await clearAccountData()
}

// Pide guardar un correo nuevo: se manda un enlace de confirmación a esa dirección.
export async function requestEmailChange(email: string): Promise<void> {
  await postJson('/api/correo', { email })
}

// Confirma el correo con el enlace recibido. Si es la cuenta de este celular, su
// correo se actualiza también acá. Devuelve el correo confirmado.
export async function confirmEmail(token: string): Promise<string> {
  const result = await postJson<{ email: string; userId: string }>(
    '/api/correo/confirmar',
    { token },
  )
  const session = getSession()
  if (session && session.user.id === result.userId) {
    saveSession({ ...session, user: { ...session.user, email: result.email } })
  }
  return result.email
}

// Trae del servidor los datos actuales de la cuenta (por ejemplo, si el correo
// se confirmó desde otro navegador). Sin conexión o sin sesión no hace nada.
export async function refreshAccount(): Promise<void> {
  const session = getSession()
  if (!session) {
    return
  }
  try {
    const response = await apiRequest<{ user?: Account }>('/api/yo')
    if (response.user && response.user.id === session.user.id) {
      saveSession({ ...session, user: response.user })
    }
  } catch {
    // Se vuelve a intentar la próxima vez.
  }
}
