import { describe, expect, it } from 'vitest'
import { dayKey, dayLabel } from './dayLabel'

// Mediodía en la hora local para no depender de la zona horaria.
const at = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).toISOString()
const NOW = new Date(2026, 9, 21, 15)

describe('dayLabel', () => {
  it('rotula hoy y ayer', () => {
    expect(dayLabel(at(2026, 10, 21), NOW)).toBe('Hoy')
    expect(dayLabel(at(2026, 10, 20), NOW)).toBe('Ayer')
  })

  it('usa la fecha corta para el resto del año', () => {
    expect(dayLabel(at(2026, 10, 18), NOW)).toBe('18 oct')
    expect(dayLabel(at(2026, 1, 5), NOW)).toBe('5 ene')
  })

  it('agrega el año si es de otro año', () => {
    expect(dayLabel(at(2025, 10, 18), NOW)).toBe('18 oct 2025')
  })

  it('ayer cruza el cambio de mes', () => {
    expect(dayLabel(at(2026, 9, 30), new Date(2026, 9, 1, 9))).toBe('Ayer')
  })
})

describe('dayKey', () => {
  it('es igual para el mismo día y distinta para otro', () => {
    expect(dayKey(at(2026, 10, 21))).toBe(dayKey(at(2026, 10, 21)))
    expect(dayKey(at(2026, 10, 21))).not.toBe(dayKey(at(2026, 10, 20)))
  })
})
