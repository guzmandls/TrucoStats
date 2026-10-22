import type { Env } from './groups'
import { requireMember } from './access'
import { errorResponse, json, unchanged, versionTag } from './http'

type Team = 'nos' | 'ellos'
type Modality = '1v1' | '2v2' | '3v3'

// Quien jugó. Un invitado (guest) no es integrante del grupo: se anotó solo
// con su nombre y no suma ni resta puntos.
interface Participant {
  id: string
  name: string
  guest?: true
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
  // Integrante que registró la partida (si todavía tiene cuenta vinculada).
  createdBy?: string
  // Cuándo recibió el servidor la partida.
  registeredAt?: string
  // Presente solo si la partida está cancelada.
  canceled?: { at: string; by: string | null; reason: string | null }
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
    if (raw.guest !== undefined && raw.guest !== true) {
      return null
    }
    team.push({
      id: raw.id,
      name: raw.name.trim(),
      ...(raw.guest === true ? { guest: true as const } : {}),
    })
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
  // Una partida cancelada mientras se contaba puede estar empatada: no cuenta
  // para nada, pero queda en el historial con el marcador que tenía.
  const abandoned = body.canceled === true
  if (
    abandoned ? scores[winner] < scores[loser] : scores[winner] <= scores[loser]
  ) {
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
  // Pueden jugar personas que no son del grupo, pero cada equipo necesita al
  // menos un integrante: así la partida cuenta para el grupo.
  if (
    nos.every((participant) => participant.guest) ||
    ellos.every((participant) => participant.guest)
  ) {
    return 'Cada equipo necesita al menos un integrante del grupo'
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
  created_by_member: string | null
  registered_at: string | null
  canceled_at: string | null
  canceled_by_member: string | null
  cancel_reason: string | null
}

interface PlayerRow {
  match_id: string
  member_id: string
  name: string
  team: Team
  is_guest: number
}

function toMatch(row: MatchRow, players: PlayerRow[]): MatchData {
  const team = (side: Team): Participant[] =>
    players
      .filter((player) => player.team === side)
      .map((player) => ({
        id: player.member_id,
        name: player.name,
        ...(player.is_guest === 1 ? { guest: true as const } : {}),
      }))
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
    ...(row.created_by_member ? { createdBy: row.created_by_member } : {}),
    ...(row.registered_at ? { registeredAt: row.registered_at } : {}),
    ...(row.canceled_at
      ? {
          canceled: {
            at: row.canceled_at,
            by: row.canceled_by_member,
            reason: row.cancel_reason,
          },
        }
      : {}),
  }
}

// Quién registró y quién canceló se devuelven como integrante del grupo, no
// como cuenta.
const MATCH_COLUMNS = `id, group_id, modality, played_at, duration_seconds, target, winner, nos_score, ellos_score,
  canceled_at, cancel_reason, registered_at,
  (SELECT mem.id FROM members mem WHERE mem.user_id = matches.created_by AND mem.group_id = matches.group_id) AS created_by_member,
  (SELECT mem.id FROM members mem WHERE mem.user_id = matches.canceled_by AND mem.group_id = matches.group_id) AS canceled_by_member`

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

export async function loadMatch(
  matchId: string,
  env: Env,
): Promise<MatchData | null> {
  const row = await env.DB.prepare(
    `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`,
  )
    .bind(matchId)
    .first<MatchRow>()
  if (!row) {
    return null
  }
  const { results } = await env.DB.prepare(
    'SELECT match_id, member_id, name, team, is_guest FROM match_players WHERE match_id = ? ORDER BY rowid',
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
  const access = await requireMember(groupId, request, env)
  if (access instanceof Response) {
    return access
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

  const everyone = [...match.teams.nos, ...match.teams.ellos]
  const memberIds = everyone
    .filter((participant) => !participant.guest)
    .map((participant) => participant.id)
  const guestIds = everyone
    .filter((participant) => participant.guest)
    .map((participant) => participant.id)
  const { results: members } = await env.DB.prepare(
    `SELECT id FROM members WHERE group_id = ? AND id IN (${everyone.map(() => '?').join(', ')})`,
  )
    .bind(groupId, ...everyone.map((participant) => participant.id))
    .all<{ id: string }>()
  if (members.length !== memberIds.length) {
    return errorResponse(
      'Los jugadores que no son invitados deben ser integrantes del grupo',
      400,
    )
  }
  if (members.some((member) => guestIds.includes(member.id))) {
    return errorResponse(
      'Un invitado no puede usar el id de un integrante',
      400,
    )
  }

  const players = (['nos', 'ellos'] as const).flatMap((team) =>
    match.teams[team].map((participant) =>
      env.DB.prepare(
        'INSERT INTO match_players (match_id, member_id, name, team, is_guest) VALUES (?, ?, ?, ?, ?)',
      ).bind(
        match.id,
        participant.id,
        participant.name,
        team,
        participant.guest ? 1 : 0,
      ),
    ),
  )

  // batch guarda la partida y sus jugadores juntos: o todo o nada.
  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO matches (id, type, group_id, modality, played_at, duration_seconds, target, winner, nos_score, ellos_score, created_by, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        access.userId,
        new Date().toISOString(),
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
  request: Request,
  env: Env,
): Promise<Response> {
  const group = await env.DB.prepare(
    'SELECT id, revision FROM groups WHERE invite_code = ?',
  )
    .bind(inviteCode)
    .first<{ id: string; revision: number }>()
  if (!group) {
    return errorResponse('Grupo no encontrado', 404)
  }
  const groupId = group.id
  const access = await requireMember(groupId, request, env)
  if (access instanceof Response) {
    return access
  }
  // Si nada cambió desde la última vez que este celular preguntó, no se leen las
  // partidas (con un historial grande es lo que más lecturas gasta).
  const tag = versionTag(group.revision, access.userId)
  const same = unchanged(request, tag)
  if (same) {
    return same
  }

  const { results: rows } = await env.DB.prepare(
    `SELECT ${MATCH_COLUMNS} FROM matches WHERE group_id = ? ORDER BY played_at DESC, rowid DESC`,
  )
    .bind(groupId)
    .all<MatchRow>()
  const { results: players } = await env.DB.prepare(
    'SELECT mp.match_id, mp.member_id, mp.name, mp.team, mp.is_guest FROM match_players mp JOIN matches m ON m.id = mp.match_id WHERE m.group_id = ? ORDER BY mp.rowid',
  )
    .bind(groupId)
    .all<PlayerRow>()

  const matches = rows.map((row) =>
    toMatch(
      row,
      players.filter((player) => player.match_id === row.id),
    ),
  )
  return json({ matches }, 200, { etag: tag })
}
