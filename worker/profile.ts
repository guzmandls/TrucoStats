import { requireMember } from './access'
import { normalizeAlias } from './aliases'
import type { Env } from './groups'
import { errorResponse, json } from './http'
import { findGroupIdByCode } from './matches'

type Team = 'nos' | 'ellos'

interface Played {
  type: 'quick' | 'group'
  won: boolean
  durationSeconds: number | null
}

interface TypeSummary {
  total: number
  wins: number
  losses: number
  winRate: number | null
}

function summarize(played: Played[]): TypeSummary {
  const total = played.length
  const wins = played.filter((item) => item.won).length
  return {
    total,
    wins,
    losses: total - wins,
    winRate: total === 0 ? null : Math.round((wins / total) * 100),
  }
}

// Las partidas de grupo que jugó un integrante (no canceladas), con el equipo en
// que jugó. Como en la app, también cuentan aquellas en que lo anotaron como
// invitado con uno de sus apodos, si no jugaba ya con su lugar.
async function memberMatches(
  memberId: string,
  groupId: string,
  env: Env,
): Promise<Played[]> {
  const { results: aliases } = await env.DB.prepare(
    'SELECT alias_norm FROM member_aliases WHERE member_id = ?',
  )
    .bind(memberId)
    .all<{ alias_norm: string }>()
  const aliasSet = new Set(aliases.map((alias) => alias.alias_norm))

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.winner, m.duration_seconds, mp.member_id, mp.name, mp.team, mp.is_guest
     FROM matches m JOIN match_players mp ON mp.match_id = m.id
     WHERE m.group_id = ? AND m.canceled_at IS NULL
     ORDER BY m.id, CASE mp.team WHEN 'nos' THEN 0 ELSE 1 END, mp.rowid`,
  )
    .bind(groupId)
    .all<{
      id: string
      winner: Team
      duration_seconds: number | null
      member_id: string
      name: string
      team: Team
      is_guest: number
    }>()

  const byMatch = new Map<string, typeof results>()
  for (const row of results) {
    byMatch.set(row.id, [...(byMatch.get(row.id) ?? []), row])
  }
  const played: Played[] = []
  for (const rows of byMatch.values()) {
    const own = rows.find(
      (row) => row.is_guest === 0 && row.member_id === memberId,
    )
    const asAlias = own
      ? undefined
      : rows.find(
          (row) => row.is_guest === 1 && aliasSet.has(normalizeAlias(row.name)),
        )
    const seat = own ?? asAlias
    if (seat) {
      played.push({
        type: 'group',
        won: rows[0].winner === seat.team,
        durationSeconds: rows[0].duration_seconds,
      })
    }
  }
  return played
}

// Las estadísticas personales de una cuenta: sus partidas rápidas y las de todos
// sus grupos. Solo números: no dice en qué grupos está ni con quién jugó.
export async function personalStats(userId: string, env: Env) {
  const { results: quick } = await env.DB.prepare(
    "SELECT winner, duration_seconds FROM matches WHERE user_id = ? AND type = 'quick'",
  )
    .bind(userId)
    .all<{ winner: Team; duration_seconds: number | null }>()
  const played: Played[] = quick.map((match) => ({
    type: 'quick',
    won: match.winner === 'nos',
    durationSeconds: match.duration_seconds,
  }))

  const { results: members } = await env.DB.prepare(
    'SELECT id, group_id FROM members WHERE user_id = ? AND active = 1',
  )
    .bind(userId)
    .all<{ id: string; group_id: string }>()
  for (const member of members) {
    played.push(...(await memberMatches(member.id, member.group_id, env)))
  }

  const durations = played
    .map((item) => item.durationSeconds)
    .filter((value): value is number => value !== null)
  return {
    ...summarize(played),
    averageDurationSeconds:
      durations.length === 0
        ? null
        : Math.round(
            durations.reduce((total, value) => total + value, 0) /
              durations.length,
          ),
    groups: members.length,
    quick: summarize(played.filter((item) => item.type === 'quick')),
    group: summarize(played.filter((item) => item.type === 'group')),
  }
}

// El perfil de un integrante, para quien comparte el grupo con él: sus
// estadísticas personales (null si nadie eligió ese lugar todavía).
export async function memberProfile(
  inviteCode: string,
  memberId: string,
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
  const member = await env.DB.prepare(
    'SELECT user_id FROM members WHERE id = ? AND group_id = ? AND active = 1',
  )
    .bind(memberId, groupId)
    .first<{ user_id: string | null }>()
  if (!member) {
    return errorResponse('Integrante no encontrado', 404)
  }
  return json({
    personal: member.user_id ? await personalStats(member.user_id, env) : null,
  })
}
