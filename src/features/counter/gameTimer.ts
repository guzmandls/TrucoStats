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

// Si el contador queda cerrado (o la app en segundo plano) más de este tiempo sin
// pausar, el cronómetro se pausa solo: no se cuenta como jugado el rato de más.
export const AWAY_LIMIT_MS = 60_000

// Ajusta el cronómetro al volver: si estuvo corriendo y pasó más de AWAY_LIMIT_MS
// desde la última vez que se usó el contador (lastActiveAt), queda pausado en
// ese límite, sin contar el resto. Si volvió antes, sigue como estaba.
export function settleTimer(
  timer: TimerState,
  lastActiveAt: number | undefined,
  now: number,
): TimerState {
  if (
    timer.startedAt === null ||
    lastActiveAt === undefined ||
    now - lastActiveAt <= AWAY_LIMIT_MS
  ) {
    return timer
  }
  return pauseTimer(timer, lastActiveAt + AWAY_LIMIT_MS)
}
