import type { Team } from '../counter/counterLogic'
import type { Match } from './types'

// Sistema de puntos (Pts) de un grupo. Todos empiezan en 0. Cada integrante suma
// al ganar y resta al perder según SUS PROPIOS puntos: con pocos puntos las
// victorias valen mucho y las derrotas casi nada (así se sube rápido al
// principio); a medida que se acerca a su nivel, suma y resta se parejan; y con
// muchos puntos las derrotas pesan más que las victorias (pero nunca más del doble).
// Por eso cada jugador se acomoda en una meseta que depende de cuánto gana: un
// jugador parejo termina cerca de MESA. Está explicado paso a paso, con ejemplos,
// en docs/requisitos.md (§6.4).

export const START_POINTS = 0
// Puntos en los que se acomoda un jugador parejo (gana la mitad de sus partidas).
export const MESA = 1500
// Lo que suma una victoria a 30 puntos, con diferencia media, contra un rival
// parejo, cuando el jugador está en la meseta. Todos los demás valores se calculan
// a partir de este.
export const BASE = 30
// Cuántas veces vale una victoria en 0 puntos respecto de la de la meseta, y cuánto
// vale una derrota en 0 puntos (casi nada).
export const WIN_FACTOR_AT_ZERO = 4.5
export const LOSS_FACTOR_AT_ZERO = 0.25
// A partir de esta fracción de la meseta (1,5 = 2250 puntos) los factores dejan de
// cambiar: ganar vale WIN_FACTOR_AT_TOP y perder LOSS_FACTOR_AT_TOP. Con 0,7 y 1,4,
// ganar suma la mitad de lo que resta perder: bastan dos victorias para compensar
// una derrota.
export const TOP = 1.5
export const WIN_FACTOR_AT_TOP = 0.7
export const LOSS_FACTOR_AT_TOP = 1.4
// Ajuste por la diferencia de puntos con el rival: cada 4000 puntos de diferencia
// mueven el resultado 100%, con un tope de 25% (de 0,75 a 1,25 de lo normal).
export const RIVAL_SCALE = 4000
export const RIVAL_MAX = 0.25

const TARGET_BASE = 30
const TARGET_FACTOR_MIN = 0.5
const TARGET_FACTOR_MAX = 1.5
const MARGIN_FACTOR_MIN = 0.75
const MARGIN_FACTOR_RANGE = 0.5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Cuánto vale una victoria según los puntos de quien gana: x4,5 en 0, x1 en la meseta
// (1500) y x0,7 desde los 2250. Baja de forma pareja entre un punto y otro.
export function winFactor(points: number): number {
  const level = points / MESA
  if (level <= 1) {
    return WIN_FACTOR_AT_ZERO - (WIN_FACTOR_AT_ZERO - 1) * level
  }
  if (level <= TOP) {
    return 1 - ((1 - WIN_FACTOR_AT_TOP) * (level - 1)) / (TOP - 1)
  }
  return WIN_FACTOR_AT_TOP
}

// Cuánto resta una derrota según los puntos de quien pierde: x0,25 en 0, x1 en la meseta y
// x1,4 desde los 2250. Sube de forma pareja entre un punto y otro.
export function lossFactor(points: number): number {
  const level = points / MESA
  if (level <= 1) {
    return LOSS_FACTOR_AT_ZERO + (1 - LOSS_FACTOR_AT_ZERO) * level
  }
  if (level <= TOP) {
    return 1 + ((LOSS_FACTOR_AT_TOP - 1) * (level - 1)) / (TOP - 1)
  }
  return LOSS_FACTOR_AT_TOP
}

// Ajuste por el rival: es positivo si el rival tiene más puntos que el propio
// equipo (ganarle vale más y perder contra él resta menos) y negativo si tiene
// menos (ganarle vale menos y perderle resta más). Va de -0,25 a +0,25.
export function rivalAdjustment(own: number, rival: number): number {
  return clamp((rival - own) / RIVAL_SCALE, -RIVAL_MAX, RIVAL_MAX)
}

// Las partidas a más puntos mueven más y las más cortas, menos (de la mitad a una
// vez y media lo normal): una partida a 30 es la referencia.
export function targetFactor(match: Match): number {
  return clamp(match.target / TARGET_BASE, TARGET_FACTOR_MIN, TARGET_FACTOR_MAX)
}

// La diferencia de la partida ajusta el movimiento: ganar muy ajustado mueve 0,75
// de lo normal y golear (ganar por todo el objetivo, por ejemplo 40 a 0) mueve
// 1,25.
export function marginFactor(match: Match): number {
  const target = match.target > 0 ? match.target : 1
  const diff = Math.abs(match.scores.nos - match.scores.ellos)
  return MARGIN_FACTOR_MIN + MARGIN_FACTOR_RANGE * Math.min(1, diff / target)
}

function average(points: Map<string, number>, ids: string[]): number {
  if (ids.length === 0) {
    return 0
  }
  const total = ids.reduce((sum, id) => sum + (points.get(id) ?? 0), 0)
  return total / ids.length
}

function startingPoints(memberIds: string[]): Map<string, number> {
  const points = new Map<string, number>()
  for (const id of memberIds) {
    points.set(id, START_POINTS)
  }
  return points
}

function inOrder(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => a.playedAt.localeCompare(b.playedAt))
}

// Aplica una partida a los puntos de los integrantes y devuelve cuánto cambió
// cada uno (los que no jugaron no aparecen). Solo cuentan los integrantes del
// grupo: los invitados no suman ni restan.
function applyMatch(
  points: Map<string, number>,
  match: Match,
): Map<string, number> {
  const changes = new Map<string, number>()
  const teamIds = (side: Team) =>
    match.teams[side]
      .map((participant) => participant.id)
      .filter((id) => points.has(id))
  const nos = teamIds('nos')
  const ellos = teamIds('ellos')
  if (nos.length === 0 || ellos.length === 0) {
    return changes
  }
  const average_ = { nos: average(points, nos), ellos: average(points, ellos) }
  const size = BASE * targetFactor(match) * marginFactor(match)

  for (const side of ['nos', 'ellos'] as Team[]) {
    const rival = side === 'nos' ? 'ellos' : 'nos'
    const adjustment = rivalAdjustment(average_[side], average_[rival])
    const won = match.winner === side
    for (const id of teamIds(side)) {
      const current = points.get(id) ?? 0
      const change = won
        ? size * winFactor(current) * (1 + adjustment)
        : -size * lossFactor(current) * (1 - adjustment)
      // Nadie baja de 0 puntos.
      const next = Math.max(0, Math.round(current + change))
      points.set(id, next)
      changes.set(id, next - current)
    }
  }
  return changes
}

export function computePoints(
  memberIds: string[],
  matches: Match[],
): Map<string, number> {
  const points = startingPoints(memberIds)
  for (const match of inOrder(matches)) {
    applyMatch(points, match)
  }
  return points
}

// Cuántos puntos sumó o restó cada integrante en cada partida, recorriendo las
// partidas en orden cronológico. La clave de afuera es el id de la partida.
export function pointChanges(
  memberIds: string[],
  matches: Match[],
): Map<string, Map<string, number>> {
  const points = startingPoints(memberIds)
  const byMatch = new Map<string, Map<string, number>>()
  for (const match of inOrder(matches)) {
    byMatch.set(match.id, applyMatch(points, match))
  }
  return byMatch
}

export function computePointsDelta(
  memberIds: string[],
  matches: Match[],
  newMatch: Match,
): Map<string, number> {
  const before = computePoints(memberIds, matches)
  const after = computePoints(memberIds, [...matches, newMatch])
  const delta = new Map<string, number>()
  for (const id of memberIds) {
    const b = before.get(id) ?? 0
    const a = after.get(id) ?? 0
    delta.set(id, a - b)
  }
  return delta
}
