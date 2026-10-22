import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { finishSplash } from './splash'

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = '<div id="splash"></div>'
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('finishSplash', () => {
  it('se desvanece apenas la app está lista y después se elimina', () => {
    finishSplash()

    expect(document.getElementById('splash')).toHaveClass('splash-out')
    vi.advanceTimersByTime(200)
    expect(document.getElementById('splash')).toBeNull()
  })

  it('llamarla dos veces no falla, y sin pantalla de inicio tampoco', () => {
    finishSplash()
    finishSplash()
    vi.advanceTimersByTime(200)
    expect(document.getElementById('splash')).toBeNull()

    expect(() => finishSplash()).not.toThrow()
  })
})
