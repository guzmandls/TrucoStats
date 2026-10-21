import type { Env } from './groups'
import { errorResponse, json } from './http'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 100
const MAX_EMAIL_LENGTH = 100
// Cloudflare Workers admite como máximo 100.000 vueltas en PBKDF2.
const HASH_ITERATIONS = 100_000
const SESSION_DAYS = 90
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Letras, números, punto, guion y guion bajo; entre 3 y 20 caracteres.
const USERNAME_FORMAT = /^[a-z0-9_.-]{3,20}$/

// Una cuenta invitada tiene username y email null (ver createGuest). El correo
// de una cuenta registrada es opcional.
export interface User {
  id: string
  username: string | null
  email: string | null
  name: string
}

interface UserRow {
  id: string
  username: string | null
  email: string | null
  name: string
  password_hash: string | null
  password_salt: string | null
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomHex(byteCount: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteCount)))
}

async function sha256(text: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
  )
}

// PBKDF2 es lento a propósito: dificulta probar millones de contraseñas si
// alguien se llevara la base de datos.
async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: HASH_ITERATIONS,
    },
    key,
    256,
  )
  return toHex(bits)
}

// Compara sin cortar en el primer carácter distinto, para no filtrar datos
// por el tiempo de respuesta.
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}

async function readBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const username = value.trim().toLowerCase()
  return USERNAME_FORMAT.test(username) ? username : null
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const email = value.trim().toLowerCase()
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_FORMAT.test(email)
    ? email
    : null
}

export async function openSession(userId: string, env: Env): Promise<string> {
  const token = randomHex(32)
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(await sha256(token), userId, now.toISOString(), expires.toISOString())
    .run()
  return token
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer ([0-9a-f]{64})$/.exec(header)
  return match ? match[1] : null
}

// Devuelve la persona que hace el pedido, o null si no inició sesión.
export async function authenticate(
  request: Request,
  env: Env,
): Promise<User | null> {
  const token = bearerToken(request)
  if (!token) {
    return null
  }
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<User>()
  return row ?? null
}

// Cuenta sin correo ni contraseña que se crea al unirse a un grupo: da una
// identidad al celular sin pedirle nada a la persona.
export async function createGuest(
  name: string,
  env: Env,
): Promise<{ token: string; user: User }> {
  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)',
  )
    .bind(id, name, new Date().toISOString())
    .run()
  return {
    token: await openSession(id, env),
    user: { id, username: null, email: null, name },
  }
}

export async function register(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body) {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const username = normalizeUsername(body.username)
  if (!username) {
    return errorResponse(
      'El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo',
      400,
    )
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
  // El correo es opcional: sirve para recuperar la contraseña más adelante.
  const hasEmail =
    body.email !== undefined &&
    body.email !== null &&
    !(typeof body.email === 'string' && body.email.trim() === '')
  const email = hasEmail ? normalizeEmail(body.email) : null
  if (hasEmail && !email) {
    return errorResponse('El correo no es válido', 400)
  }

  if (
    await env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first()
  ) {
    return errorResponse('Ese usuario ya existe', 409)
  }
  if (
    email &&
    (await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first())
  ) {
    return errorResponse('Ya existe una cuenta con ese correo', 409)
  }

  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  // Si quien se registra ya tiene una cuenta invitada, esa misma cuenta pasa a
  // ser una cuenta registrada: conserva su integrante, su nombre y su historial.
  const guest = await authenticate(request, env)
  const upgrading = guest !== null && guest.username === null
  const id = upgrading ? guest.id : crypto.randomUUID()
  const user: User = {
    id,
    username,
    email,
    name: upgrading ? guest.name : username,
  }
  try {
    await (
      upgrading
        ? env.DB.prepare(
            'UPDATE users SET username = ?, email = ?, password_hash = ?, password_salt = ? WHERE id = ?',
          ).bind(username, email, passwordHash, salt, id)
        : env.DB.prepare(
            'INSERT INTO users (id, username, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ).bind(
            id,
            username,
            email,
            user.name,
            passwordHash,
            salt,
            new Date().toISOString(),
          )
    ).run()
  } catch {
    return errorResponse('Ese usuario o correo ya existe', 409)
  }
  return json({ token: await openSession(id, env), user }, 201)
}

// Se entra con el usuario o con el correo (si la cuenta tiene uno).
export async function login(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body) {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const identifier =
    typeof body.identifier === 'string'
      ? body.identifier.trim().toLowerCase()
      : ''
  const password = body.password
  // El mismo mensaje para "no existe" y "contraseña mala": no revela qué
  // usuarios o correos tienen cuenta.
  const rejected = errorResponse('Usuario o contraseña incorrectos', 401)
  if (identifier === '' || typeof password !== 'string') {
    return rejected
  }
  const column = identifier.includes('@') ? 'email' : 'username'
  const row = await env.DB.prepare(
    `SELECT id, username, email, name, password_hash, password_salt FROM users WHERE ${column} = ?`,
  )
    .bind(identifier)
    .first<UserRow>()
  if (!row || !row.password_hash || !row.password_salt) {
    return rejected
  }
  const hash = await hashPassword(password, row.password_salt)
  if (!sameText(hash, row.password_hash)) {
    return rejected
  }
  const user: User = {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
  }
  return json({ token: await openSession(row.id, env), user })
}

export async function currentUser(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await authenticate(request, env)
  return user ? json({ user }) : errorResponse('No iniciaste sesión', 401)
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const token = bearerToken(request)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(await sha256(token))
      .run()
  }
  return json({ ok: true })
}
