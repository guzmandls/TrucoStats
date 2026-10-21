import type { Group } from '../groups/types'
import type { Match, Participant } from './types'

// Nombre en minúsculas y sin tildes, para comparar apodos sin que importe cómo
// se escribieron ("Juancho", "juancho", "JUANCHÓ").
export function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// De qué integrante es cada apodo del grupo.
function aliasOwners(group: Group): Map<string, { id: string; name: string }> {
  const owners = new Map<string, { id: string; name: string }>()
  for (const member of group.members) {
    for (const alias of member.aliases ?? []) {
      owners.set(normalizeName(alias), { id: member.id, name: member.name })
    }
  }
  return owners
}

// La partida tal como cuenta para las estadísticas y los puntos del grupo: un
// invitado cuyo nombre es un apodo de un integrante pasa a ser ese integrante, y
// los demás invitados se quitan (no suman ni restan puntos; la partida cuenta
// como si la jugaran solo los integrantes). El historial sigue mostrando a todos
// con el nombre con el que los anotaron.
export function forStats(group: Group, matches: Match[]): Match[] {
  const owners = aliasOwners(group)
  return matches.map((match) => {
    if (
      !match.teams.nos.some((player) => player.guest) &&
      !match.teams.ellos.some((player) => player.guest)
    ) {
      return match
    }
    const inMatch = new Set(
      [...match.teams.nos, ...match.teams.ellos]
        .filter((player) => !player.guest)
        .map((player) => player.id),
    )
    const resolve = (team: Participant[]): Participant[] => {
      const result: Participant[] = []
      for (const player of team) {
        if (!player.guest) {
          result.push(player)
          continue
        }
        const owner = owners.get(normalizeName(player.name))
        // Si el integrante ya juega esta partida, el invitado es otra persona.
        if (owner && !inMatch.has(owner.id)) {
          inMatch.add(owner.id)
          result.push({ id: owner.id, name: owner.name })
        }
      }
      return result
    }
    return {
      ...match,
      teams: {
        nos: resolve(match.teams.nos),
        ellos: resolve(match.teams.ellos),
      },
    }
  })
}

// Pasa lo que escribió la persona ("Juan, juancho; Juanito") a una lista de
// apodos sin vacíos ni repetidos.
export function parseAliasList(text: string): string[] {
  const aliases: string[] = []
  for (const part of text.split(/[,;\n]/)) {
    const alias = part.trim()
    if (
      alias !== '' &&
      !aliases.some((item) => normalizeName(item) === normalizeName(alias))
    ) {
      aliases.push(alias)
    }
  }
  return aliases
}
