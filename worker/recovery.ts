import type { Env } from './groups'
import { errorResponse, json } from './http'
import { confirmMail, mailConfigured, resetMail, sendMail } from './mail'
import {
  authenticate,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  openSession,
  randomHex,
  readBody,
  sha256,
  type User,
} from './users'

const RESET_MINUTES = 60
const CONFIRM_HOURS = 24
// Para que nadie use la app para llenar de correos a otra persona.
const MAX_PER_HOUR = 3
const HOUR_MS = 60 * 60 * 1000

function appUrl(request: Request, env: Env): string {
  return (env.APP_URL ?? new URL(request.url).origin).replace(/\/+$/, '')
}

async function recentCount(
  userId: string,
  purpose: 'reset' | 'confirm',
  env: Env,
): Promise<number> {
  const since = new Date(Date.now() - HOUR_MS).toISOString()
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM email_tokens WHERE user_id = ? AND purpose = ? AND created_at >= ?',
  )
    .bind(userId, purpose, since)
    .first<{ total: number }>()
  return row?.total ?? 0
}

// Crea un enlace de un solo uso y devuelve el token (solo se guarda su hash).
async function createToken(
  userId: string,
  purpose: 'reset' | 'confirm',
  lifetimeMs: number,
  email: string | null,
  env: Env,
): Promise<string> {
  const token = randomHex(32)
  const now = new Date()
  await env.DB.prepare(
    'INSERT INTO email_tokens (token_hash, user_id, purpose, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      await sha256(token),
      userId,
      purpose,
      email,
      now.toISOString(),
      new Date(now.getTime() + lifetimeMs).toISOString(),
    )
    .run()
  return token
}

interface TokenRow {
  token_hash: string
  user_id: string
  email: string | null
}

// Busca un enlace vigente. Devuelve null si no existe, ya se usó o venció.
async function findToken(
  token: unknown,
  purpose: 'reset' | 'confirm',
  env: Env,
): Promise<TokenRow | null> {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return null
  }
  return await env.DB.prepare(
    'SELECT token_hash, user_id, email FROM email_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > ?',
  )
    .bind(await sha256(token), purpose, new Date().toISOString())
    .first<TokenRow>()
}

// Pide un enlace para elegir una contraseña nueva. Responde siempre lo mismo,
// exista o no la cuenta y tenga o no correo, para no revelar quién tiene cuenta.
export async function requestPasswordReset(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = await readBody(request)
  const identifier =
    typeof body?.identifier === 'string'
      ? body.identifier.trim().toLowerCase()
      : ''
  if (identifier === '' || identifier.length > 100) {
    return errorResponse('Escribe tu usuario o tu correo', 400)
  }
  const column = identifier.includes('@') ? 'email' : 'username'
  const user = await env.DB.prepare(
    `SELECT id, username, email FROM users
     WHERE ${column} = ? AND email IS NOT NULL AND password_hash IS NOT NULL`,
  )
    .bind(identifier)
    .first<{ id: string; username: string; email: string }>()

  if (user && (await recentCount(user.id, 'reset', env)) < MAX_PER_HOUR) {
    const token = await createToken(
      user.id,
      'reset',
      RESET_MINUTES * 60 * 1000,
      null,
      env,
    )
    const sent = await sendMail(
      env,
      resetMail(
        user.email,
        user.username,
        `${appUrl(request, env)}/restablecer/${token}`,
      ),
    )
    if (!sent) {
      await env.DB.prepare('DELETE FROM email_tokens WHERE token_hash = ?')
        .bind(await sha256(token))
        .run()
    }
  }
  return json({ ok: true })
}

// Elige la contraseña nueva con el enlace del correo. Cierra todas las sesiones
// de la cuenta y deja iniciada una nueva en este celular.
export async function resetPassword(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = await readBody(request)
  if (!body) {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const { password } = body
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return errorResponse(
      `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      400,
    )
  }
  const row = await findToken(body.token, 'reset', env)
  if (!row) {
    return errorResponse('El enlace no es válido o ya venció', 400)
  }
  const user = await env.DB.prepare(
    'SELECT id, username, email, name FROM users WHERE id = ?',
  )
    .bind(row.user_id)
    .first<User>()
  if (!user) {
    return errorResponse('El enlace no es válido o ya venció', 400)
  }

  const salt = randomHex(16)
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
    ).bind(await hashPassword(password, salt), salt, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare(
      "DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'reset'",
    ).bind(user.id),
  ])
  return json({ token: await openSession(user.id, env), user })
}

// Pide guardar un correo nuevo: se manda un enlace a ese correo y recién al
// abrirlo queda guardado (así se sabe que es de la persona).
export async function requestEmailChange(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse('Necesitas una cuenta registrada', 401)
  }
  const body = await readBody(request)
  const email = normalizeEmail(body?.email)
  if (!email) {
    return errorResponse('El correo no es válido', 400)
  }
  if (email === user.email) {
    return errorResponse('Ese ya es el correo de tu cuenta', 409)
  }
  if (
    await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
  ) {
    return errorResponse('Ya existe una cuenta con ese correo', 409)
  }
  if (!mailConfigured(env)) {
    return errorResponse(
      'El envío de correos no está disponible por ahora',
      503,
    )
  }
  if ((await recentCount(user.id, 'confirm', env)) >= MAX_PER_HOUR) {
    return errorResponse(
      'Pediste demasiados correos. Inténtalo de nuevo en un rato',
      429,
    )
  }

  // Un pedido nuevo reemplaza al anterior.
  await env.DB.prepare(
    "DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'confirm'",
  )
    .bind(user.id)
    .run()
  const token = await createToken(
    user.id,
    'confirm',
    CONFIRM_HOURS * HOUR_MS,
    email,
    env,
  )
  const sent = await sendMail(
    env,
    confirmMail(email, `${appUrl(request, env)}/confirmar-correo/${token}`),
  )
  if (!sent) {
    await env.DB.prepare('DELETE FROM email_tokens WHERE token_hash = ?')
      .bind(await sha256(token))
      .run()
    return errorResponse(
      'No se pudo enviar el correo. Inténtalo de nuevo más tarde',
      502,
    )
  }
  return json({ ok: true, email })
}

// Abre el enlace del correo de confirmación: el correo queda guardado.
export async function confirmEmail(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = await readBody(request)
  const row = await findToken(body?.token, 'confirm', env)
  if (!row || !row.email) {
    return errorResponse('El enlace no es válido o ya venció', 400)
  }
  if (
    await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id <> ?')
      .bind(row.email, row.user_id)
      .first()
  ) {
    return errorResponse('Ya existe una cuenta con ese correo', 409)
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(
      row.email,
      row.user_id,
    ),
    env.DB.prepare('DELETE FROM email_tokens WHERE token_hash = ?').bind(
      row.token_hash,
    ),
  ])
  return json({ ok: true, email: row.email, userId: row.user_id })
}
