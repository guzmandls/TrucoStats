import type { Env } from './groups'
import {
  anyLocked,
  clearFailures,
  passwordKeys,
  recordFailures,
  tooMany,
} from './attempts'
import { errorResponse, json } from './http'
import { leaveAs } from './leave'
import {
  authenticate,
  bearerToken,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  randomHex,
  readBody,
  sameText,
  sha256,
  type User,
  USERNAME_RULES,
} from './users'

// Comprueba la contraseña de una cuenta registrada. Como al iniciar sesión,
// muchos intentos incorrectos bloquean un rato ("locked").
async function checkPassword(
  request: Request,
  userId: string,
  password: unknown,
  env: Env,
): Promise<'ok' | 'wrong' | 'locked'> {
  const keys = passwordKeys(request, `account:${userId}`)
  if (await anyLocked(keys, env)) {
    return 'locked'
  }
  const right = await passwordMatches(userId, password, env)
  if (!right) {
    await recordFailures(keys, env)
    return 'wrong'
  }
  await clearFailures(keys[0].key, env)
  return 'ok'
}

async function passwordMatches(
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
  const check = await checkPassword(request, user.id, body?.current, env)
  if (check === 'locked') {
    return tooMany()
  }
  if (check === 'wrong') {
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

// Elimina la cuenta: pide la contraseña. Sale de todos sus grupos como con
// "Salir del grupo" (su integrante queda libre y sus partidas siguen contando
// para los demás; si era el único integrante, el grupo se elimina) y después se
// borra la cuenta, con sus sesiones y enlaces de correo.
export async function deleteAccount(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await registeredUser(request, env)
  if (user instanceof Response) {
    return user
  }
  const body = await readBody(request)
  const check = await checkPassword(request, user.id, body?.password, env)
  if (check === 'locked') {
    return tooMany()
  }
  if (check === 'wrong') {
    return errorResponse('La contraseña no es correcta', 403)
  }

  const { results } = await env.DB.prepare(
    'SELECT id, group_id FROM members WHERE user_id = ?',
  )
    .bind(user.id)
    .all<{ id: string; group_id: string }>()
  for (const member of results) {
    await leaveAs(member.group_id, member.id, env)
  }
  // Las sesiones y los enlaces de correo se borran en cascada.
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
  return json({ ok: true })
}

// Cambia el usuario con el que se inicia sesión. No pide la contraseña (como el
// correo): el usuario solo no da acceso a nada. Puede cambiar solo las
// mayúsculas del propio ("guzman" → "Guzman").
export async function changeUsername(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await registeredUser(request, env)
  if (user instanceof Response) {
    return user
  }
  const body = await readBody(request)
  const username = normalizeUsername(body?.username)
  if (!username) {
    return errorResponse(USERNAME_RULES, 400)
  }
  if (username === user.username) {
    return errorResponse('Ese ya es tu usuario', 409)
  }
  if (
    await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?',
    )
      .bind(username, user.id)
      .first()
  ) {
    return errorResponse('Ese usuario ya existe', 409)
  }
  await env.DB.prepare('UPDATE users SET username = ? WHERE id = ?')
    .bind(username, user.id)
    .run()
  return json({ user: { ...user, username } })
}
