import { describe, expect, it } from 'vitest'
import {
  AWAY_LIMIT_MS,
  createTimer,
  elapsedSeconds,
  formatClock,
  isPaused,
  pauseTimer,
  resumeTimer,
  settleTimer,
} from './gameTimer'

describe('gameTimer', () => {
  it('arranca corriendo y mide el tramo activo', () => {
    const timer = createTimer(1000)
    expect(isPaused(timer)).toBe(false)
    expect(elapsedSeconds(timer, 1000)).toBe(0)
    expect(elapsedSeconds(timer, 4000)).toBe(3)
  })

  it('al pausar detiene el conteo', () => {
    const running = createTimer(1000)
    const paused = pauseTimer(running, 6000)
    expect(isPaused(paused)).toBe(true)
    expect(elapsedSeconds(paused, 6000)).toBe(5)
    expect(elapsedSeconds(paused, 20000)).toBe(5)
  })

  it('al reanudar continúa desde lo acumulado', () => {
    const paused = pauseTimer(createTimer(1000), 6000)
    const resumed = resumeTimer(paused, 10000)
    expect(isPaused(resumed)).toBe(false)
    expect(elapsedSeconds(resumed, 10000)).toBe(5)
    expect(elapsedSeconds(resumed, 12000)).toBe(7)
  })

  it('no cuenta el tiempo en pausa', () => {
    let timer = createTimer(0)
    timer = pauseTimer(timer, 10000)
    timer = resumeTimer(timer, 50000)
    expect(elapsedSeconds(timer, 55000)).toBe(15)
  })

  it('pausar dos veces no cambia el resultado', () => {
    const paused = pauseTimer(createTimer(0), 4000)
    expect(pauseTimer(paused, 9000)).toEqual(paused)
  })

  it('resumir dos veces no reinicia el tramo', () => {
    const resumed = resumeTimer(createTimer(0), 4000)
    expect(resumeTimer(resumed, 9000)).toEqual(resumed)
  })

  it('formatea el reloj en minutos y segundos', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(600)).toBe('10:00')
  })

  it('formatea con horas cuando corresponde', () => {
    expect(formatClock(3661)).toBe('1:01:01')
  })
})

describe('settleTimer (contador cerrado sin pausar)', () => {
  it('si se volvió dentro del minuto, el cronómetro sigue como estaba', () => {
    const running = createTimer(0)
    const settled = settleTimer(running, 10_000, 10_000 + AWAY_LIMIT_MS)
    expect(settled).toBe(running)
  })

  it('si pasó más de un minuto, queda pausado en el límite (no cuenta el resto)', () => {
    const running = createTimer(0)
    const settled = settleTimer(running, 100_000, 100_000 + 45 * 60_000)
    expect(isPaused(settled)).toBe(true)
    // 100 s jugados + 60 s de gracia, no 45 minutos más.
    expect(elapsedSeconds(settled, 100_000 + 45 * 60_000)).toBe(160)
  })

  it('un cronómetro ya pausado no cambia, ni uno sin última vez conocida', () => {
    const paused = pauseTimer(createTimer(0), 5_000)
    expect(settleTimer(paused, 0, 10 * 60_000)).toBe(paused)
    const running = createTimer(0)
    expect(settleTimer(running, undefined, 10 * 60_000)).toBe(running)
  })
})
