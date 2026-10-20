import type { Env } from './groups'
import { errorResponse, json } from './http'

type Team = 'nos' | 'ellos'
type Modality = '1v1' | '2v2' | '3v3'

interface Participant {
  id: string
  name: string
}

// Partida de grupo tal como la guarda y la lee la app.
export interface MatchData {
  id: string
  type: 'group'
  groupId: string
  modality: Modality
  playedAt: string
  durationSeconds: number | null
  target: number
  winner: Team
  teams: Record<Team, Participant[]>
  scores: Record<Team, number>
}

const TEAM_SIZE: Record<Modality, number> = { '1v1': 1, '2v2': 2, '3v3': 3 }
const MIN_TARGET = 10
const MAX_TARGET = 100
const TARGET_STEP = 5
const MAX_ID_LENGTH = 100
const MAX_NAME_LENGTH = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function parseTeam(value: unknown): Participant[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const team: Participant[] = []
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      !isNonEmptyString(raw.id, MAX_ID_LENGTH) ||
      !isNonEmptyString(raw.name, MAX_NAME_LENGTH)
    ) {
      return null
    }
    team.push({ id: raw.id, name: raw.name.trim() })
  }
  return team
}

// Valida lo que envía la app. Devuelve la partida limpia o un mensaje de error.
export function parseMatch(body: unknown, groupId: string): MatchData | string {
  if (!isRecord(body)) {
    return 'El cuerpo debe ser un objeto JSON'
  }
  if (!isNonEmptyString(body.id, MAX_ID_LENGTH)) {
    return 'Falta el id de la partida'
  }
  if (body.type !== 'group') {
    return 'Solo se guardan partidas de grupo'
  }
  if (
    body.modality !== '1v1' &&
    body.modality !== '2v2' &&
    body.modality !== '3v3'
  ) {
    return 'La modalidad debe ser 1v1, 2v2 o 3v3'
  }
  const modality: Modality = body.modality
  if (
    typeof body.playedAt !== 'string' ||
    Number.isNaN(Date.parse(body.playedAt))
  ) {
    return 'La fecha de la partida no es válida'
  }
  if (body.durationSeconds !== null && !isCount(body.durationSeconds)) {
    return 'La duración debe ser un número de segundos o null'
  }
  if (
    !isCount(body.target) ||
    body.target < MIN_TARGET ||
    body.target > MAX_TARGET ||
    body.target % TARGET_STEP !== 0
  ) {
    return `El objetivo debe ir de ${MIN_TARGET} a ${MAX_TARGET} de a ${TARGET_STEP}`
  }
  if (
    !isRecord(body.scores) ||
    !isCount(body.scores.nos) ||
    !isCount(body.scores.ellos)
  ) {
    return 'Los puntajes deben ser números enteros'
  }
  const scores = { nos: body.scores.nos, ellos: body.scores.ellos }
  if (body.winner !== 'nos' && body.winner !== 'ellos') {
    return 'El ganador debe ser nos o ellos'
  }
  const winner: Team = body.winner
  const loser: Team = winner === 'nos' ? 'ellos' : 'nos'
  if (scores[winner] <= scores[loser]) {
    return 'El ganador debe tener más puntos que el perdedor'
  }

  const rawTeams = isRecord(body.teams) ? body.teams : {}
  const nos = parseTeam(rawTeams.nos)
  const ellos = parseTeam(rawTeams.ellos)
  if (!nos || !ellos) {
    return 'Cada equipo necesita integrantes con id y nombre válidos'
  }
  if (
    nos.length !== TEAM_SIZE[modality] ||
    ellos.length !== TEAM_SIZE[modality]
  ) {
    return `La modalidad ${modality} necesita ${TEAM_SIZE[modality]} por equipo`
  }
  const ids = [...nos, ...ellos].map((participant) => participant.id)
  if (new Set(ids).size !== ids.length) {
    return 'Un integrante no puede repetirse en la partida'
  }

  return {
    id: body.id,
    type: 'group',
    groupId,
    modality,
    playedAt: body.playedAt,
    durationSeconds: body.durationSeconds,
    target: body.target,
    winner,
    teams: { nos, ellos },
    scores,
  }
}

interface MatchRow {
  id: string
  group_id: string
  modality: Modality
  played_at: string
  duration_seconds: number | null
  target: number
  winner: Team
  nos_score: number
  ellos_score: number
}

interface PlayerRow {
  match_id: string
  member_id: string
  name: string
  team: Team
}

function toMatch(row: MatchRow, players: PlayerRow[]): MatchData {
  const team = (side: Team): Participant[] =>
    players
      .filter((player) => player.team === side)
      .map((player) => ({ id: player.member_id, name: player.name }))
  return {
    id: row.id,
    type: 'group',
    groupId: row.group_id,
    modality: row.modality,
    playedAt: row.played_at,
    durationSeconds: row.duration_seconds,
    target: row.target,
    winner: row.winner,
    teams: { nos: team('nos'), ellos: team('ellos') },
    scores: { nos: row.nos_score, ellos: row.ellos_score },
  }
}

const MATCH_COLUMNS =
  'id, group_id, modality, played_at, duration_seconds, target, winner, nos_score, ellos_score'

export async function findGroupIdByCode(
  inviteCode: string,
  env: Env,
): Promise<string | null> {
  const group = await env.DB.prepare(
    'SELECT id FROM groups WHERE invite_code = ?',
  )
    .bind(inviteCode)
    .first<{ id: string }>()
  return group?.id ?? null
}

async function loadMatch(matchId: string, env: Env): Promise<MatchData | null> {
  const row = await env.DB.prepare(
    `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`,
  )
    .bind(matchId)
    .first<MatchRow>()
  if (!row) {
    return null
  }
  const { results } = await env.DB.prepare(
    'SELECT match_id, member_id, name, team FROM match_players WHERE match_id = ? ORDER BY rowid',
  )
    .bind(matchId)
    .all<PlayerRow>()
  return toMatch(row, results)
}

export async function createMatch(
  inviteCode: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('El cuerpo no es un JSON válido', 400)
  }
  const match = parseMatch(body, groupId)
  if (typeof match === 'string') {
    return errorResponse(match, 400)
  }

  // Si la app reintenta una partida ya guardada, se devuelve la existente.
  const existing = await loadMatch(match.id, env)
  if (existing) {
    return existing.groupId === groupId
      ? json({ match: existing })
      : errorResponse('Ya existe una partida con ese id', 409)
  }

  const memberIds = [...match.teams.nos, ...match.teams.ellos].map(
    (participant) => participant.id,
  )
  const { results: members } = await env.DB.prepare(
    `SELECT id FROM members WHERE group_id = ? AND id IN (${memberIds.map(() => '?').join(', ')})`,
  )
    .bind(groupId, ...memberIds)
    .all<{ id: string }>()
  if (members.length !== memberIds.length) {
    return errorResponse(
      'Todos los jugadores deben ser integrantes del grupo',
      400,
    )
  }

  const players = (['nos', 'ellos'] as const).flatMap((team) =>
    match.teams[team].map((participant) =>
      env.DB.prepare(
        'INSERT INTO match_players (match_id, member_id, name, team) VALUES (?, ?, ?, ?)',
      ).bind(match.id, participant.id, participant.name, team),
    ),
  )

  // batch guarda la partida y sus jugadores juntos: o todo o nada.
  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO matches (id, type, group_id, modality, played_at, duration_seconds, target, winner, nos_score, ellos_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        match.id,
        'group',
        groupId,
        match.modality,
        match.playedAt,
        match.durationSeconds,
        match.target,
        match.winner,
        match.scores.nos,
        match.scores.ellos,
      ),
      ...players,
    ])
  } catch {
    return errorResponse('Ya existe una partida con ese id', 409)
  }

  return json({ match }, 201)
}

export async function listMatches(
  inviteCode: string,
  env: Env,
): Promise<Response> {
  const groupId = await findGroupIdByCode(inviteCode, env)
  if (!groupId) {
    return errorResponse('Grupo no encontrado', 404)
  }

  const { results: rows } = await env.DB.prepare(
    `SELECT ${MATCH_COLUMNS} FROM matches WHERE group_id = ? ORDER BY played_at DESC, rowid DESC`,
  )
    .bind(groupId)
    .all<MatchRow>()
  const { results: players } = await env.DB.prepare(
    'SELECT mp.match_id, mp.member_id, mp.name, mp.team FROM match_players mp JOIN matches m ON m.id = mp.match_id WHERE m.group_id = ? ORDER BY mp.rowid',
  )
    .bind(groupId)
    .all<PlayerRow>()

  const matches = rows.map((row) =>
    toMatch(
      row,
      players.filter((player) => player.match_id === row.id),
    ),
  )
  return json({ matches })
}
