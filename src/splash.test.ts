import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { finishSplash } from './splash'

function addSplash(svgSeconds?: number) {
  document.body.innerHTML = `<div id="splash"><svg id="splash-logo"></svg></div>`
  if (svgSeconds !== undefined) {
    const logo = document.getElementById('splash-logo') as unknown as {
      getCurrentTime: () => number
    }
    logo.getCurrentTime = () => svgSeconds
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('finishSplash', () => {
  it('si la animación ya terminó, se desvanece enseguida y después se va', () => {
    addSplash(1.5)

    finishSplash()
    vi.advanceTimersByTime(0)

    expect(document.getElementById('splash')).toHaveClass('splash-out')
    vi.advanceTimersByTime(200)
    expect(document.getElementById('splash')).toBeNull()
  })

  it('si la app estuvo lista antes, espera solo lo que le falta a la animación', () => {
    addSplash(0.3)

    finishSplash()
    vi.advanceTimersByTime(999)
    expect(document.getElementById('splash')).not.toHaveClass('splash-out')
    vi.advanceTimersByTime(1)
    expect(document.getElementById('splash')).toHaveClass('splash-out')
  })

  it('llamarla dos veces no hace nada distinto, y sin pantalla de inicio no falla', () => {
    addSplash(2)
    finishSplash()
    finishSplash()
    vi.advanceTimersByTime(200)
    expect(document.getElementById('splash')).toBeNull()

    expect(() => finishSplash()).not.toThrow()
  })
})
