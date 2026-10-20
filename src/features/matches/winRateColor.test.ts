import { describe, expect, it } from 'vitest'
import { winRateColor } from './winRateColor'

describe('winRateColor', () => {
  it('devuelve los colores de los extremos exactos', () => {
    expect(winRateColor(0)).toBe('#ef4444')
    expect(winRateColor(100)).toBe('#15803d')
    expect(winRateColor(50)).toBe('#b9e195')
    expect(winRateColor(85)).toBe('#22c55e')
  })

  it('interpola linealmente entre dos paradas sin redondear', () => {
    expect(winRateColor(47)).toBe('#dbdf81')
    expect(winRateColor(47.5)).toBe('#d9df82')
  })

  it('acota fuera del rango 0..100', () => {
    expect(winRateColor(-10)).toBe('#ef4444')
    expect(winRateColor(150)).toBe('#15803d')
  })
})
