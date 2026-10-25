import { isNonEmptyString, MAX_AVATAR_LENGTH, type Env } from './groups'
import { errorResponse, json } from './http'
import { authenticate } from './users'

// La foto es de la cuenta: una sola para todos sus grupos. Cada integrante
// vinculado guarda una copia, así que cambiarla la cambia en todos (y los
// disparadores avisan a cada grupo que hubo un cambio).
export function setAccountAvatarStatements(
  userId: string,
  avatar: string | null,
  env: Env,
): D1PreparedStatement[] {
  return [
    env.DB.prepare('UPDATE users SET avatar = ? WHERE id = ?').bind(
      avatar,
      userId,
    ),
    env.DB.prepare('UPDATE members SET avatar = ? WHERE user_id = ?').bind(
      avatar,
      userId,
    ),
  ]
}

// Al vincular una cuenta con un integrante: el integrante pasa a mostrar la
// foto de la cuenta. Si la cuenta todavía no tiene foto y el integrante sí (se
// la puso un administrador), esa queda como foto de la cuenta.
export function linkAvatarStatements(
  userId: string,
  memberId: string,
  env: Env,
): D1PreparedStatement[] {
  return [
    env.DB.prepare(
      `UPDATE users SET avatar = COALESCE(avatar, (SELECT avatar FROM members WHERE id = ?))
       WHERE id = ?`,
    ).bind(memberId, userId),
    env.DB.prepare(
      `UPDATE members SET avatar = (SELECT avatar FROM users WHERE id = ?)
       WHERE user_id = ?`,
    ).bind(userId, userId),
  ]
}

// Cambia (o quita, con null) la foto de la cuenta con sesión iniciada.
export async function updateMyAvatar(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await authenticate(request, env)
  if (!user || user.username === null) {
    return errorResponse('No iniciaste sesión', 401)
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const avatar = (
    typeof body === 'object' && body !== null
      ? (body as { avatar?: unknown }).avatar
      : undefined
  ) as unknown
  if (avatar !== null && !isNonEmptyString(avatar, MAX_AVATAR_LENGTH)) {
    return errorResponse('La foto no es válida', 400)
  }
  await env.DB.batch(
    setAccountAvatarStatements(user.id, avatar as string | null, env),
  )
  return json({ avatar })
}
