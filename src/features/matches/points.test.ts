import { describe, expect, it } from 'vitest'
import type { Match, Participant } from './types'
import {
  computePoints,
  lossFactor,
  matchFactor,
  nivelFactor,
  winBoost,
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
    playedAt: `2026-01-${String(sequence).padStart(2, '0')}T00:00:00.000Z`,
    durationSeconds: 600,
    target: 40,
    winner: 'nos',
    teams: { nos: [juan, pedro], ellos: [luis, ana] },
    scores: { nos: 40, ellos: 0 },
    ...overrides,
  }
}

describe('factores', () => {
  it('el factor de partida va de 0,75 (ajustado) a 1,0 (goleada)', () => {
    expect(matchFactor(buildMatch({ scores: { nos: 40, ellos: 0 } }))).toBe(1)
    expect(
      matchFactor(buildMatch({ scores: { nos: 40, ellos: 39 } })),
    ).toBeCloseTo(0.75625)
  })

  it('el factor de nivel baja cuando el ganador tiene ventaja', () => {
    expect(nivelFactor(0, 0)).toBe(1)
    expect(nivelFactor(900, 0)).toBeCloseTo(0.6)
    expect(nivelFactor(300, 0)).toBeCloseTo(0.8333, 3)
    expect(nivelFactor(0, 360)).toBeCloseTo(1.2)
    expect(nivelFactor(0, 5000)).toBe(1.4)
    expect(nivelFactor(5000, 0)).toBe(0.6)
  })

  it('la ganancia vale x1,8 en 0 puntos y vuelve a x1 en 200', () => {
    expect(winBoost(0)).toBe(1.8)
    expect(winBoost(100)).toBeCloseTo(1.4)
    expect(winBoost(200)).toBe(1)
    expect(winBoost(500)).toBe(1)
  })

  it('la pérdida resta poco (x0,25) en 0 puntos y normal en 200', () => {
    expect(lossFactor(0)).toBeCloseTo(0.25)
    expect(lossFactor(200)).toBe(1)
    expect(lossFactor(500)).toBe(1)
  })
})

describe('computePoints', () => {
  it('una goleada en 0 puntos vale 1,8 veces el objetivo', () => {
    const points = computePoints(
      ['m1', 'm2', 'm3', 'm4'],
      [buildMatch({ scores: { nos: 40, ellos: 0 } })],
    )
    expect(points.get('m1')).toBe(72)
    expect(points.get('m2')).toBe(72)
  })

  it('ganar ajustado suma menos que golear', () => {
    const goleada = computePoints(
      ['m1', 'm2', 'm3', 'm4'],
      [buildMatch({ scores: { nos: 40, ellos: 0 } })],
    )
    const ajustado = computePoints(
      ['m1', 'm2', 'm3', 'm4'],
      [buildMatch({ scores: { nos: 40, ellos: 39 } })],
    )
    expect(goleada.get('m1') ?? 0).toBeGreaterThan(ajustado.get('m1') ?? 0)
  })

  it('perder resta poco cuando el perdedor tiene 0 puntos', () => {
    const points = computePoints(
      ['m1', 'm2', 'm3', 'm4'],
      [buildMatch({ scores: { nos: 40, ellos: 0 } })],
    )
    expect(points.get('m3')).toBe(0)
    expect(points.get('m4')).toBe(0)
  })

  it('nunca deja un puntaje negativo', () => {
    const matches = Array.from({ length: 5 }, () =>
      buildMatch({ winner: 'nos', scores: { nos: 40, ellos: 0 } }),
    )
    const points = computePoints(['m1', 'm2', 'm3', 'm4'], matches)
    expect(points.get('m3')).toBe(0)
    expect(points.get('m4')).toBe(0)
  })

  it('processa partidas en orden cronológico sin importar el orden de entrada', () => {
    const early = buildMatch({ scores: { nos: 40, ellos: 0 } })
    early.playedAt = '2026-01-01T00:00:00.000Z'
    const late = buildMatch({ scores: { nos: 40, ellos: 0 } })
    late.playedAt = '2026-02-01T00:00:00.000Z'
    const a = computePoints(['m1', 'm2', 'm3', 'm4'], [early, late])
    const b = computePoints(['m1', 'm2', 'm3', 'm4'], [late, early])
    expect(a.get('m1')).toBe(b.get('m1'))
  })
})
