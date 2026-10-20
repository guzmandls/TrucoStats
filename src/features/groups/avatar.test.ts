import { describe, expect, it } from 'vitest'
import { avatarColor, avatarColors } from './avatar'

describe('avatarColor', () => {
  it('devuelve el mismo color para el mismo id', () => {
    expect(avatarColor('m1')).toBe(avatarColor('m1'))
  })

  it('devuelve un color con formato hexadecimal', () => {
    expect(avatarColor('m1')).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('avatarColors', () => {
  it('no repite colores dentro del grupo', () => {
    const ids = Array.from({ length: 15 }, (_, index) => `member-${index}`)
    const colors = Object.values(avatarColors(ids))
    expect(new Set(colors).size).toBe(ids.length)
  })

  it('es estable para la misma lista de integrantes', () => {
    const ids = ['a', 'b', 'c']
    expect(avatarColors(ids)).toEqual(avatarColors(ids))
  })
})
