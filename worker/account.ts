import type { Env } from './groups'
import { errorResponse, json } from './http'
import {
  authenticate,
  bearerToken,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  randomHex,
  readBody,
  sameText,
  sha256,
  type User,
} from './users'

// Comprueba la contraseña de una cuenta registrada.
async function checkPassword(
  userId: string,
  password: unknown,
  env: Env,
): Promise<boolean> {
  if (typeof password !== 'string') {
    return false
  }
  const row = await env.DB.prepare(
    'SELECT password_hash, password_salt FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ password_hash: string | null; password_salt: string | null }>()
  if (!row?.password_hash || !row.password_salt) {
    return false
  }
  return sameText(
    await hashPassword(password, row.password_salt),
    row.password_hash,
  )
}

// La cuenta registrada de quien pregunta, o la respuesta de error.
async function registeredUser(
  request: Request,
  env: Env,
): Promise<User | Response> {
  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse('Necesitas una cuenta registrada', 401)
  }
  return user
}

// Cambia la contraseña con la sesión iniciada: pide la actual. Este celular
// sigue con la sesión iniciada y se cierran las de los demás.
export async function changePassword(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await registeredUser(request, env)
  if (user instanceof Response) {
    return user
  }
  const body = await readBody(request)
  const password = body?.password
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return errorResponse(
      `La contraseña nueva debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      400,
    )
  }
  if (!(await checkPassword(user.id, body?.current, env))) {
    return errorResponse('La contraseña actual no es correcta', 403)
  }

  const salt = randomHex(16)
  const current = await sha256(bearerToken(request) ?? '')
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
    ).bind(await hashPassword(password, salt), salt, user.id),
    env.DB.prepare(
      'DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?',
    ).bind(user.id, current),
    // Un enlace de recuperación pedido antes ya no debe servir.
    env.DB.prepare(
      "DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'reset'",
    ).bind(user.id),
  ])
  return json({ ok: true })
}
