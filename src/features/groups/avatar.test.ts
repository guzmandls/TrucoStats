import { describe, expect, it } from 'vitest'
import { avatarColor } from './avatar'

describe('avatarColor', () => {
  it('devuelve el mismo color para el mismo id', () => {
    expect(avatarColor('m1')).toBe(avatarColor('m1'))
  })

  it('devuelve un color con formato hexadecimal', () => {
    expect(avatarColor('m1')).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
