export interface TimerState {
  /** Segundos de los tramos ya cerrados (sin contar el tramo activo). */
  baseSeconds: number
  /** Momento (ms) en que empezó el tramo activo; null si está en pausa. */
  startedAt: number | null
}

export function createTimer(now: number): TimerState {
  return { baseSeconds: 0, startedAt: now }
}

export function isPaused(timer: TimerState): boolean {
  return timer.startedAt === null
}

export function elapsedSeconds(timer: TimerState, now: number): number {
  const active =
    timer.startedAt === null
      ? 0
      : Math.max(0, Math.floor((now - timer.startedAt) / 1000))
  return timer.baseSeconds + active
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.startedAt === null) {
    return timer
  }
  return {
    baseSeconds: elapsedSeconds(timer, now),
    startedAt: null,
  }
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  if (timer.startedAt !== null) {
    return timer
  }
  return { baseSeconds: timer.baseSeconds, startedAt: now }
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
  const ss = String(secs).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
