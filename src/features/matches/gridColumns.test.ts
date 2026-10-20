import { describe, expect, it } from 'vitest'
import { gridColumns } from './gridColumns'

describe('gridColumns', () => {
  it('usa una sola página si entra en el máximo', () => {
    expect(gridColumns(1)).toBe(1)
    expect(gridColumns(4)).toBe(4)
    expect(gridColumns(6)).toBe(6)
  })

  it('reparte en columnas parejas cuando supera el máximo', () => {
    expect(gridColumns(16)).toBe(4)
    expect(gridColumns(15)).toBe(5)
    expect(gridColumns(8)).toBe(4)
    expect(gridColumns(9)).toBe(3)
    expect(gridColumns(13)).toBe(5)
    expect(gridColumns(7)).toBe(4)
  })

  it('nunca elige menos de 3 columnas con varios integrantes', () => {
    expect(gridColumns(7)).toBeGreaterThanOrEqual(3)
    expect(gridColumns(13)).toBeGreaterThanOrEqual(3)
  })
})
