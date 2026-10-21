import { matchDate } from './format'
import type { Match } from './types'

// Minúsculas y sin tildes, para que "Perez" encuentre "Pérez".
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Todo lo que se puede buscar de una partida: participantes, fecha (en número
// y con el nombre del mes), resultado, modalidad y puntos de la partida.
function searchText(match: Match): string {
  const names = [...match.teams.nos, ...match.teams.ellos].map(
    (participant) => participant.name,
  )
  const month = new Date(match.playedAt).toLocaleDateString('es-UY', {
    month: 'long',
  })
  return normalize(
    [
      ...names,
      matchDate(match),
      month,
      `${match.scores.nos} ${match.scores.ellos}`,
      `${match.scores.nos}-${match.scores.ellos}`,
      match.modality ?? '',
      `${match.target} puntos`,
      match.canceled ? `cancelada ${match.canceled.reason ?? ''}` : '',
    ].join(' '),
  )
}

// Cada palabra de la búsqueda tiene que aparecer en la partida ("juan 30"
// encuentra las partidas de Juan con un 30).
export function filterMatches(matches: Match[], query: string): Match[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return matches
  }
  return matches.filter((match) => {
    const text = searchText(match)
    return terms.every((term) => text.includes(term))
  })
}
