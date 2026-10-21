import { describe, expect, it } from 'vitest'
import type { Match, Participant } from './types'
import {
  K,
  MIN_SHARE,
  PARTICIPATION_BONUS,
  START_POINTS,
  computePoints,
  computePointsDelta,
  expectedScore,
  marginFactor,
  pointChanges,
  targetFactor,
  transfer,
} from './points'

let sequence = 0

const juan: Participant = { id: 'm1', name: 'Juan' }
const pedro: Participant = { id: 'm2', name: 'Pedro' }
const luis: Participant = { id: 'm3', name: 'Luis' }
const ana: Participant = { id: 'm4', name: 'Ana' }

function buildMatch(overrides: Partial<Match> = {}): Match {
  sequence += 1
  return {
    id: `match-${sequence}`,
    type: 'group',
    groupId: 'g1',
    modality: '2v2',
    playedAt: new Date(Date.UTC(2026, 0, 1, 0, sequence)).toISOString(),
    durationSeconds: 600,
    target: 40,
    winner: 'nos',
    teams: { nos: [juan, pedro], ellos: [luis, ana] },
    scores: { nos: 40, ellos: 0 },
    ...overrides,
  }
}

const ALL = ['m1', 'm2', 'm3', 'm4']

describe('reglas del sistema', () => {
  it('todos empiezan con los mismos puntos', () => {
    const points = computePoints(ALL, [])
    expect([...points.values()]).toEqual([
      START_POINTS,
      START_POINTS,
      START_POINTS,
      START_POINTS,
    ])
  })

  it('el resultado esperado es 50% con los mismos puntos y crece con la ventaja', () => {
    expect(expectedScore(1200, 1200)).toBe(0.5)
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5)
    expect(expectedScore(1400, 1200)).toBeCloseTo(0.613, 2)
    expect(expectedScore(2200, 1200)).toBeCloseTo(0.909, 2)
    // Es simétrico: lo que espera uno es lo que no espera el otro.
    expect(expectedScore(1500, 1200) + expectedScore(1200, 1500)).toBeCloseTo(1)
  })

  it('las partidas a más puntos mueven más (de 0,5 a 1,5 de lo normal)', () => {
    expect(targetFactor(buildMatch({ target: 30 }))).toBe(1)
    expect(targetFactor(buildMatch({ target: 40 }))).toBeCloseTo(1.333, 2)
    expect(targetFactor(buildMatch({ target: 15 }))).toBe(0.5)
    expect(targetFactor(buildMatch({ target: 10 }))).toBe(0.5)
    expect(targetFactor(buildMatch({ target: 100 }))).toBe(1.5)
  })

  it('ganar ajustado mueve 0,75 de lo normal y golear, 1,25', () => {
    expect(marginFactor(buildMatch({ scores: { nos: 40, ellos: 40 } }))).toBe(
      0.75,
    )
    expect(marginFactor(buildMatch({ scores: { nos: 40, ellos: 0 } }))).toBe(
      1.25,
    )
    expect(
      marginFactor(buildMatch({ scores: { nos: 40, ellos: 39 } })),
    ).toBeCloseTo(0.7625, 4)
  })

  it('una victoria entre equipos iguales mueve K x factores x 0,5', () => {
    const match = buildMatch({ target: 30, scores: { nos: 30, ellos: 0 } })
    // K x 1 (a 30) x 1,25 (goleada) x 0,5 (resultado esperado a medias)
    expect(transfer(match, 1200, 1200)).toBe(Math.round(K * 1.25 * 0.5))
  })

  it('una victoria inesperada mueve más que una esperada', () => {
    const match = buildMatch({ target: 30, scores: { nos: 30, ellos: 15 } })
    const expected = transfer(match, 1600, 1200)
    const even = transfer(match, 1200, 1200)
    const upset = transfer(match, 1200, 1600)
    expect(upset).toBeGreaterThan(even)
    expect(even).toBeGreaterThan(expected)
  })

  it('ganarle a alguien con muchísimos menos puntos nunca vale menos de la parte mínima', () => {
    const match = buildMatch({ target: 30, scores: { nos: 30, ellos: 0 } })
    const minimum = Math.round(K * 1.25 * MIN_SHARE)
    expect(transfer(match, 5000, 0)).toBe(minimum)
    expect(transfer(match, 2400, 1200)).toBeGreaterThanOrEqual(minimum)
  })
})

describe('computePoints', () => {
  it('la partida es un intercambio: lo que suma el ganador lo resta el perdedor (más la constancia)', () => {
    const match = buildMatch({ scores: { nos: 40, ellos: 0 } })
    const moved = transfer(match, START_POINTS, START_POINTS)
    const points = computePoints(ALL, [match])

    expect(points.get('m1')).toBe(START_POINTS + moved + PARTICIPATION_BONUS)
    expect(points.get('m2')).toBe(START_POINTS + moved + PARTICIPATION_BONUS)
    expect(points.get('m3')).toBe(START_POINTS - moved + PARTICIPATION_BONUS)
    expect(points.get('m4')).toBe(START_POINTS - moved + PARTICIPATION_BONUS)
  })

  it('premia la constancia: todos los que juegan suman un poco, gane quien gane', () => {
    const points = computePoints(ALL, [
      buildMatch({ scores: { nos: 40, ellos: 39 } }),
    ])
    const average =
      ALL.reduce((total, id) => total + (points.get(id) ?? 0), 0) / ALL.length
    expect(average).toBe(START_POINTS + PARTICIPATION_BONUS)
  })

  it('quien no juega no cambia', () => {
    const points = computePoints(
      [...ALL, 'm5'],
      [buildMatch({ scores: { nos: 40, ellos: 0 } })],
    )
    expect(points.get('m5')).toBe(START_POINTS)
  })

  it('ganar ajustado suma menos que golear', () => {
    const goleada = computePoints(ALL, [
      buildMatch({ scores: { nos: 40, ellos: 0 } }),
    ])
    const ajustado = computePoints(ALL, [
      buildMatch({ scores: { nos: 40, ellos: 39 } }),
    ])
    expect(goleada.get('m1') ?? 0).toBeGreaterThan(ajustado.get('m1') ?? 0)
  })

  it('el que ya tiene muchos más puntos sigue sumando al ganar (más que solo la constancia)', () => {
    // m1 le gana muchísimas veces seguidas al mismo rival.
    const matches = Array.from({ length: 40 }, () =>
      buildMatch({
        teams: { nos: [juan], ellos: [luis] },
        modality: '1v1',
        scores: { nos: 40, ellos: 20 },
      }),
    )
    const changes = pointChanges(ALL, matches)
    const last = changes.get(matches[matches.length - 1].id)
    expect(last?.get('m1')).toBeGreaterThan(PARTICIPATION_BONUS)
  })

  it('ganarle a alguien parejo suma más que ganarle a alguien con muchos menos puntos', () => {
    const duel = (a: Participant, b: Participant) =>
      buildMatch({
        teams: { nos: [a], ellos: [b] },
        modality: '1v1',
        scores: { nos: 40, ellos: 20 },
      })
    const first = duel(juan, luis)
    const even = pointChanges(ALL, [first]).get(first.id)?.get('m1') ?? 0

    // m1 le gana 10 veces a m4 y recién después enfrenta a m3, que sigue parejo
    // con el inicio: m1 ya tiene muchos más puntos que m3.
    const history = Array.from({ length: 10 }, () => duel(juan, ana))
    const later = duel(juan, luis)
    const changes = pointChanges(ALL, [...history, later])

    expect(changes.get(later.id)?.get('m1') ?? 0).toBeLessThan(even)
  })

  it('nunca deja un puntaje negativo', () => {
    const matches = Array.from({ length: 200 }, () =>
      buildMatch({
        teams: { nos: [juan], ellos: [luis] },
        modality: '1v1',
        winner: 'nos',
        target: 100,
        scores: { nos: 100, ellos: 0 },
      }),
    )
    const points = computePoints(ALL, matches)
    expect(points.get('m3') ?? -1).toBeGreaterThanOrEqual(0)
  })

  it('procesa las partidas en orden cronológico sin importar el orden de entrada', () => {
    const early = buildMatch({ scores: { nos: 40, ellos: 0 } })
    early.playedAt = '2026-01-01T00:00:00.000Z'
    const late = buildMatch({ scores: { nos: 40, ellos: 0 } })
    late.playedAt = '2026-02-01T00:00:00.000Z'
    const a = computePoints(ALL, [early, late])
    const b = computePoints(ALL, [late, early])
    expect(a.get('m1')).toBe(b.get('m1'))
  })

  it('los jugadores que no son del grupo (invitados) no cuentan', () => {
    const match = buildMatch({
      teams: {
        nos: [juan, { id: 'x1', name: 'Beto' }],
        ellos: [luis],
      },
      scores: { nos: 40, ellos: 0 },
    })
    const points = computePoints(ALL, [match])
    expect(points.has('x1')).toBe(false)
    expect(points.get('m1')).toBeGreaterThan(START_POINTS)
  })

  it('computePointsDelta dice cuánto cambió cada uno con la partida nueva', () => {
    const newMatch = buildMatch({ scores: { nos: 40, ellos: 0 } })
    const delta = computePointsDelta(ALL, [], newMatch)
    expect(delta.get('m1')).toBe(
      transfer(newMatch, START_POINTS, START_POINTS) + PARTICIPATION_BONUS,
    )
    expect(delta.get('m3')).toBeLessThan(0)
  })
})

describe('equilibrio', () => {
  it('dos jugadores parejos que se alternan las victorias no se separan', () => {
    const matches = Array.from({ length: 60 }, (_, index) =>
      buildMatch({
        teams: { nos: [juan], ellos: [luis] },
        modality: '1v1',
        winner: index % 2 === 0 ? 'nos' : 'ellos',
        scores:
          index % 2 === 0 ? { nos: 40, ellos: 25 } : { nos: 25, ellos: 40 },
      }),
    )
    const points = computePoints(ALL, matches)
    const a = points.get('m1') ?? 0
    const b = points.get('m3') ?? 0
    expect(Math.abs(a - b)).toBeLessThan(100)
    // El promedio subió solo por la constancia: 60 partidas x 3 puntos cada uno.
    expect((a + b) / 2).toBeCloseTo(START_POINTS + 60 * PARTICIPATION_BONUS, -1)
  })
})
