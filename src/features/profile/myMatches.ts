import type { Group } from '../groups/types'
import { forStats } from '../matches/guests'
import type { Team } from '../counter/counterLogic'
import type { Match } from '../matches/types'

const OTHER: Record<Team, Team> = { nos: 'ellos', ellos: 'nos' }

// Las partidas que cuentan para el perfil personal, contadas desde el equipo de
// la persona (su equipo queda como "Nosotros"):
// - las partidas rápidas, tal cual (se cuenta como propia la de "Nosotros");
// - las de grupo en las que jugó su integrante (también anotado con un apodo).
// Las de grupo en las que no jugó, o de grupos donde no se sabe quién es, no
// cuentan.
export function myMatches(matches: Match[], groups: Group[]): Match[] {
  const quick = matches.filter((match) => match.type === 'quick')
  const mine: Match[] = []
  for (const group of groups) {
    const me = group.myMemberId
    if (!me) {
      continue
    }
    const played = forStats(
      group,
      matches.filter(
        (match) => match.type === 'group' && match.groupId === group.id,
      ),
    )
    for (const match of played) {
      if (match.teams.nos.some((player) => player.id === me)) {
        mine.push(match)
      } else if (match.teams.ellos.some((player) => player.id === me)) {
        mine.push({
          ...match,
          winner: OTHER[match.winner],
          teams: { nos: match.teams.ellos, ellos: match.teams.nos },
          scores: { nos: match.scores.ellos, ellos: match.scores.nos },
        })
      }
    }
  }
  return [...quick, ...mine]
}
