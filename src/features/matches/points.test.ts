import { describe, expect, it } from 'vitest'
import type { Match, Participant } from './types'
import {
  BASE,
  LOSS_FACTOR_AT_TOP,
  LOSS_FACTOR_AT_ZERO,
  MESA,
  START_POINTS,
  WIN_FACTOR_AT_TOP,
  WIN_FACTOR_AT_ZERO,
  computePoints,
  computePointsDelta,
  lossFactor,
  marginFactor,
  pointChanges,
  rivalAdjustment,
  targetFactor,
  winFactor,
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

// Un 1 contra 1 a 30 con una diferencia media (el factor de diferencia es ~1).
function duel(a: Participant, b: Participant, winner: 'nos' | 'ellos' = 'nos') {
  return buildMatch({
    teams: { nos: [a], ellos: [b] },
    modality: '1v1',
    target: 30,
    winner,
    scores: winner === 'nos' ? { nos: 30, ellos: 15 } : { nos: 15, ellos: 30 },
  })
}

describe('arranque', () => {
  it('todos empiezan en 0 puntos', () => {
    expect([...computePoints(ALL, []).values()]).toEqual([0, 0, 0, 0])
  })

  it('con un integrante en 0, la primera victoria suma mucho y la primera derrota no resta', () => {
    const points = computePoints(ALL, [duel(juan, luis)])
    expect(points.get('m1')).toBeGreaterThan(100)
    expect(points.get('m3')).toBe(0)
  })
})

describe('factores', () => {
  it('la victoria vale x4,5 en 0, x1 en la meseta y x0,7 desde los 2250', () => {
    expect(winFactor(0)).toBe(WIN_FACTOR_AT_ZERO)
    expect(winFactor(MESA)).toBe(1)
    expect(winFactor(MESA * 1.5)).toBeCloseTo(WIN_FACTOR_AT_TOP)
    expect(winFactor(5000)).toBeCloseTo(WIN_FACTOR_AT_TOP)
    expect(winFactor(750)).toBeCloseTo(2.75)
  })

  it('la derrota resta x0,25 en 0, x1 en la meseta y x1,4 desde los 2250', () => {
    expect(lossFactor(0)).toBe(LOSS_FACTOR_AT_ZERO)
    expect(lossFactor(MESA)).toBe(1)
    expect(lossFactor(MESA * 1.5)).toBeCloseTo(LOSS_FACTOR_AT_TOP)
    expect(lossFactor(5000)).toBeCloseTo(LOSS_FACTOR_AT_TOP)
    expect(lossFactor(750)).toBeCloseTo(0.625)
  })

  it('la victoria vale cada vez menos y la derrota cada vez más a medida que se suben puntos', () => {
    const levels = [0, 300, 700, 1100, 1500, 1900, 2250, 3000]
    for (let i = 1; i < levels.length; i += 1) {
      expect(winFactor(levels[i])).toBeLessThanOrEqual(winFactor(levels[i - 1]))
      expect(lossFactor(levels[i])).toBeGreaterThanOrEqual(
        lossFactor(levels[i - 1]),
      )
    }
  })

  it('arriba de todo bastan dos victorias para compensar una derrota', () => {
    expect(lossFactor(3000) / winFactor(3000)).toBeCloseTo(2)
  })

  it('en la meseta una victoria y una derrota se compensan', () => {
    expect(winFactor(MESA)).toBe(lossFactor(MESA))
  })

  it('el ajuste por el rival va de -0,25 a +0,25 y es positivo si el rival tiene más puntos', () => {
    expect(rivalAdjustment(1500, 1500)).toBe(0)
    expect(rivalAdjustment(0, 1000)).toBeCloseTo(0.25)
    expect(rivalAdjustment(0, 400)).toBeCloseTo(0.1)
    expect(rivalAdjustment(1000, 0)).toBeCloseTo(-0.25)
    expect(rivalAdjustment(0, 100000)).toBe(0.25)
    expect(rivalAdjustment(100000, 0)).toBe(-0.25)
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

  it('el tamaño base de una partida a 30 con diferencia media es de unos 30 puntos', () => {
    const match = duel(juan, luis)
    const size = BASE * targetFactor(match) * marginFactor(match)
    expect(size).toBeGreaterThan(26)
    expect(size).toBeLessThan(34)
  })
})

describe('computePoints', () => {
  it('quien no juega no cambia', () => {
    const points = computePoints([...ALL, 'm5'], [duel(juan, luis)])
    expect(points.get('m5')).toBe(START_POINTS)
  })

  it('golear suma más que ganar ajustado', () => {
    const goleada = computePoints(ALL, [
      buildMatch({ scores: { nos: 40, ellos: 0 } }),
    ])
    const ajustado = computePoints(ALL, [
      buildMatch({ scores: { nos: 40, ellos: 39 } }),
    ])
    expect(goleada.get('m1') ?? 0).toBeGreaterThan(ajustado.get('m1') ?? 0)
  })

  it('una partida a más puntos mueve más', () => {
    const corta = computePoints(ALL, [
      buildMatch({ target: 20, scores: { nos: 20, ellos: 10 } }),
    ])
    const larga = computePoints(ALL, [
      buildMatch({ target: 40, scores: { nos: 40, ellos: 20 } }),
    ])
    expect(larga.get('m1') ?? 0).toBeGreaterThan(corta.get('m1') ?? 0)
  })

  it('ganarle a un rival con más puntos suma más que ganarle a uno con menos', () => {
    // m1 sube ganando; m3 queda en 0. Después m4 (en 0) le gana a cada uno.
    const warmup = Array.from({ length: 8 }, () => duel(juan, luis))
    const base = computePoints(ALL, warmup)
    expect(base.get('m1') ?? 0).toBeGreaterThan(base.get('m3') ?? 0)

    const vsStrong = duel(ana, juan)
    const vsWeak = duel(ana, luis)
    const strongGain =
      pointChanges(ALL, [...warmup, vsStrong])
        .get(vsStrong.id)
        ?.get('m4') ?? 0
    const weakGain =
      pointChanges(ALL, [...warmup, vsWeak])
        .get(vsWeak.id)
        ?.get('m4') ?? 0
    expect(strongGain).toBeGreaterThan(weakGain)
  })

  it('al que ya tiene muchos puntos le sigue valiendo la pena ganarle a alguien con pocos', () => {
    const wins = Array.from({ length: 80 }, () => duel(juan, luis))
    const changes = pointChanges(ALL, wins)
    const last = changes.get(wins[wins.length - 1].id)?.get('m1') ?? 0
    // Aunque ya esté arriba y el rival esté en el piso, todavía suma.
    expect(last).toBeGreaterThan(10)
  })

  it('nunca deja un puntaje negativo', () => {
    const matches = Array.from({ length: 200 }, () => duel(juan, luis))
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
    const newMatch = duel(juan, luis)
    const delta = computePointsDelta(ALL, [], newMatch)
    expect(delta.get('m1')).toBeGreaterThan(0)
    expect(delta.get('m3')).toBe(0)
  })
})

describe('meseta', () => {
  // Dos jugadores del mismo nivel (se alternan las victorias) terminan cerca de la
  // meseta, sin dispararse.
  it('dos jugadores parejos terminan cerca de los 1500 puntos', () => {
    const matches = Array.from({ length: 160 }, (_, index) =>
      duel(juan, luis, index % 2 === 0 ? 'nos' : 'ellos'),
    )
    const points = computePoints(ALL, matches)
    for (const id of ['m1', 'm3']) {
      expect(points.get(id) ?? 0).toBeGreaterThan(1250)
      expect(points.get(id) ?? 0).toBeLessThan(1800)
    }
  })

  it('quien gana más que el otro se acomoda más arriba', () => {
    // m1 gana 2 de cada 3 partidas contra m3.
    const matches = Array.from({ length: 180 }, (_, index) =>
      duel(juan, luis, index % 3 === 2 ? 'ellos' : 'nos'),
    )
    const points = computePoints(ALL, matches)
    expect(points.get('m1') ?? 0).toBeGreaterThan(1700)
    expect(points.get('m3') ?? 0).toBeLessThan(points.get('m1') ?? 0)
  })

  it('un jugador parejo ya está cerca de los 1000 puntos en unas 40 partidas', () => {
    const matches = Array.from({ length: 40 }, (_, index) =>
      duel(juan, luis, index % 2 === 0 ? 'nos' : 'ellos'),
    )
    expect(computePoints(ALL, matches).get('m1') ?? 0).toBeGreaterThan(900)
  })
})
