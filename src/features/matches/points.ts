import type { Team } from '../counter/counterLogic'
import type { Match } from './types'

// Sistema de puntos (Pts) de un grupo. Es una variante simple del sistema Elo:
// cada partida es un intercambio de puntos entre los dos equipos, y lo que se
// mueve depende de qué tan esperado era el resultado. Está explicado paso a paso
// en docs/requisitos.md (§6.4).

// Puntos con los que empieza todo integrante (y punto de partida del promedio).
export const START_POINTS = 1200
// Cuántos puntos se mueven, como máximo, en una partida de 30 puntos con un
// resultado completamente inesperado.
export const K = 50
// Escala de la curva de "resultado esperado": con esta diferencia de puntos entre
// dos equipos, el de más puntos tiene ~91% de probabilidad esperada de ganar. Es
// una escala ancha a propósito: en el truco influye mucho la suerte, así que no
// se espera que el de más puntos gane casi siempre.
export const SCALE = 1000
// Lo que se mueve por una victoria nunca baja de esta parte del máximo, para que
// ganarle a alguien con muchos menos puntos siga sumando algo.
export const MIN_SHARE = 0.25
// Puntos que suma cada integrante que juega una partida, gane o pierda: premia la
// constancia.
export const PARTICIPATION_BONUS = 3

const TARGET_BASE = 30
const TARGET_FACTOR_MIN = 0.5
const TARGET_FACTOR_MAX = 1.5
const MARGIN_FACTOR_MIN = 0.75
const MARGIN_FACTOR_RANGE = 0.5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Probabilidad esperada de que gane un equipo con `own` puntos (promedio del
// equipo) contra uno con `rival`. Es 50% si tienen los mismos puntos.
export function expectedScore(own: number, rival: number): number {
  return 1 / (1 + 10 ** ((rival - own) / SCALE))
}

// Las partidas a más puntos mueven más, y las más cortas, menos (de la mitad a una
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

// Puntos que el equipo ganador le saca al perdedor (a cada integrante del
// perdedor le resta esto y a cada integrante del ganador le suma esto). Es mayor
// cuanto más inesperada fue la victoria, y nunca menos de MIN_SHARE del máximo.
export function transfer(
  match: Match,
  winnerAvg: number,
  loserAvg: number,
): number {
  const surprise = Math.max(MIN_SHARE, 1 - expectedScore(winnerAvg, loserAvg))
  return Math.round(K * targetFactor(match) * marginFactor(match) * surprise)
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
  const avgNos = average(points, nos)
  const avgEllos = average(points, ellos)
  const moved =
    match.winner === 'nos'
      ? transfer(match, avgNos, avgEllos)
      : transfer(match, avgEllos, avgNos)

  for (const side of ['nos', 'ellos'] as Team[]) {
    const sign = match.winner === side ? 1 : -1
    for (const id of teamIds(side)) {
      const current = points.get(id) ?? 0
      // Nadie baja de 0 puntos.
      const next = Math.max(0, current + sign * moved + PARTICIPATION_BONUS)
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
