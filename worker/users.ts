import type { Env } from './groups'
import { errorResponse, json } from './http'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 100
const MAX_EMAIL_LENGTH = 100
const MAX_NAME_LENGTH = 20
// Cloudflare Workers admite como máximo 100.000 vueltas en PBKDF2.
const HASH_ITERATIONS = 100_000
const SESSION_DAYS = 90
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface User {
  id: string
  email: string
  name: string
}

interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string
  password_salt: string
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

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const email = value.trim().toLowerCase()
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_FORMAT.test(email)
    ? email
    : null
}

async function openSession(userId: string, env: Env): Promise<string> {
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
    `SELECT u.id, u.email, u.name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<User>()
  return row ?? null
}

export async function register(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body) {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const email = normalizeEmail(body.email)
  if (!email) {
    return errorResponse('El correo no es válido', 400)
  }
  const { password, name } = body
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
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.trim().length > MAX_NAME_LENGTH
  ) {
    return errorResponse(
      `El nombre es obligatorio (hasta ${MAX_NAME_LENGTH} caracteres)`,
      400,
    )
  }

  const taken = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>()
  if (taken) {
    return errorResponse('Ya existe una cuenta con ese correo', 409)
  }

  const id = crypto.randomUUID()
  const salt = randomHex(16)
  const user: User = { id, email, name: name.trim() }
  try {
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        email,
        user.name,
        await hashPassword(password, salt),
        salt,
        new Date().toISOString(),
      )
      .run()
  } catch {
    return errorResponse('Ya existe una cuenta con ese correo', 409)
  }
  return json({ token: await openSession(id, env), user }, 201)
}

export async function login(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body) {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const email = normalizeEmail(body.email)
  const password = body.password
  // El mismo mensaje para "no existe" y "contraseña mala": no revela qué
  // correos tienen cuenta.
  const rejected = errorResponse('Correo o contraseña incorrectos', 401)
  if (!email || typeof password !== 'string') {
    return rejected
  }
  const row = await env.DB.prepare(
    'SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?',
  )
    .bind(email)
    .first<UserRow>()
  if (!row) {
    return rejected
  }
  const hash = await hashPassword(password, row.password_salt)
  if (!sameText(hash, row.password_hash)) {
    return rejected
  }
  const user: User = { id: row.id, email: row.email, name: row.name }
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
