import type { Env } from './groups'
import { errorResponse, json } from './http'
import { authenticate, type User } from './users'

const MIN_TARGET = 10
const MAX_TARGET = 100
const TARGET_STEP = 5
const MAX_ID_LENGTH = 100

interface QuickRow {
  id: string
  played_at: string
  duration_seconds: number | null
  target: number
  winner: 'nos' | 'ellos'
  nos_score: number
  ellos_score: number
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

async function accountOf(request: Request, env: Env): Promise<User | Response> {
  const user = await authenticate(request, env)
  return user && user.username !== null
    ? user
    : errorResponse('No iniciaste sesión', 401)
}

// Una partida rápida como la usa la app: "Nosotros" contra "Ellos", sin grupo.
function toMatch(row: QuickRow) {
  return {
    id: row.id,
    type: 'quick',
    groupId: null,
    modality: null,
    playedAt: row.played_at,
    durationSeconds: row.duration_seconds,
    target: row.target,
    winner: row.winner,
    teams: { nos: [], ellos: [] },
    scores: { nos: row.nos_score, ellos: row.ellos_score },
  }
}

// Las partidas rápidas de la cuenta, de la más nueva a la más vieja.
export async function listQuickMatches(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await accountOf(request, env)
  if (user instanceof Response) {
    return user
  }
  const { results } = await env.DB.prepare(
    `SELECT id, played_at, duration_seconds, target, winner, nos_score, ellos_score
     FROM matches WHERE user_id = ? AND type = 'quick'
     ORDER BY played_at DESC`,
  )
    .bind(user.id)
    .all<QuickRow>()
  return json({ matches: results.map(toMatch) })
}

// Guarda una partida rápida en la cuenta. Enviarla dos veces no la duplica.
export async function createQuickMatch(
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await accountOf(request, env)
  if (user instanceof Response) {
    return user
  }
  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    body = (
      typeof parsed === 'object' && parsed !== null ? parsed : {}
    ) as Record<string, unknown>
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const scores = (
    typeof body.scores === 'object' && body.scores !== null ? body.scores : {}
  ) as Record<string, unknown>
  if (
    typeof body.id !== 'string' ||
    body.id.trim() === '' ||
    body.id.length > MAX_ID_LENGTH
  ) {
    return errorResponse('Falta el id de la partida', 400)
  }
  if (
    typeof body.playedAt !== 'string' ||
    Number.isNaN(Date.parse(body.playedAt))
  ) {
    return errorResponse('La fecha de la partida no es válida', 400)
  }
  if (body.durationSeconds !== null && !isCount(body.durationSeconds)) {
    return errorResponse(
      'La duración debe ser un número de segundos o null',
      400,
    )
  }
  if (
    !isCount(body.target) ||
    body.target < MIN_TARGET ||
    body.target > MAX_TARGET ||
    body.target % TARGET_STEP !== 0
  ) {
    return errorResponse(
      `El objetivo debe ir de ${MIN_TARGET} a ${MAX_TARGET} de a ${TARGET_STEP}`,
      400,
    )
  }
  if (!isCount(scores.nos) || !isCount(scores.ellos)) {
    return errorResponse('Los puntajes deben ser números enteros', 400)
  }
  const winner = body.winner
  if (winner !== 'nos' && winner !== 'ellos') {
    return errorResponse('El ganador debe ser nos o ellos', 400)
  }
  const loser = winner === 'nos' ? 'ellos' : 'nos'
  if ((scores[winner] as number) <= (scores[loser] as number)) {
    return errorResponse(
      'El ganador debe tener más puntos que el perdedor',
      400,
    )
  }

  const existing = await env.DB.prepare(
    'SELECT user_id FROM matches WHERE id = ?',
  )
    .bind(body.id)
    .first<{ user_id: string | null }>()
  if (existing) {
    return existing.user_id === user.id
      ? json({ ok: true })
      : errorResponse('Ya existe una partida con ese id', 409)
  }
  await env.DB.prepare(
    `INSERT INTO matches (id, type, group_id, modality, played_at, duration_seconds,
       target, winner, nos_score, ellos_score, user_id)
     VALUES (?, 'quick', NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      body.playedAt,
      body.durationSeconds,
      body.target,
      winner,
      scores.nos,
      scores.ellos,
      user.id,
    )
    .run()
  return json({ ok: true }, 201)
}

// Elimina del todo una partida rápida de la cuenta (no queda cancelada).
export async function deleteQuickMatch(
  matchId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const user = await accountOf(request, env)
  if (user instanceof Response) {
    return user
  }
  await env.DB.prepare(
    "DELETE FROM matches WHERE id = ? AND user_id = ? AND type = 'quick'",
  )
    .bind(matchId, user.id)
    .run()
  return json({ ok: true })
}
