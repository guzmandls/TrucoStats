import { ApiError } from '../../lib/api'
import { publishLive, publishShared, type LiveState } from './liveApi'

const KEY = 'trucostats.pendingLiveEnds'

export interface LiveEnd {
  // Partida de grupo: el código del grupo. Partida rápida compartida: vacío, y
  // va el id para mirarla.
  inviteCode: string
  shareId?: string
  liveId: string
  state: LiveState
  status: 'finished' | 'canceled'
  reason?: string
}

function read(): LiveEnd[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as LiveEnd[]) : []
  } catch {
    return []
  }
}

function write(items: LiveEnd[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Sin almacenamiento no se puede recordar el cierre pendiente.
  }
}

function send(end: LiveEnd): Promise<void> {
  const options = { status: end.status, reason: end.reason }
  return end.shareId
    ? publishShared(end.shareId, end.state, options)
    : publishLive(end.inviteCode, end.liveId, end.state, options)
}

// Un rechazo definitivo del servidor (que no sea falta de sesión) no mejora
// reintentando.
function isFinal(error: unknown): boolean {
  return error instanceof ApiError && error.status < 500 && error.status !== 401
}

// Avisa que la partida en vivo terminó o se canceló. Si no hay conexión queda
// pendiente y se vuelve a intentar cuando se sincroniza el grupo, para que
// quienes la miran no la vean en juego para siempre.
export async function endLive(end: LiveEnd): Promise<void> {
  try {
    await send(end)
  } catch (error) {
    if (!isFinal(error)) {
      write([...read().filter((item) => item.liveId !== end.liveId), end])
    }
  }
}

export async function retryPendingLiveEnds(): Promise<void> {
  const pending = read()
  if (pending.length === 0) {
    return
  }
  const left: LiveEnd[] = []
  for (const end of pending) {
    try {
      await send(end)
    } catch (error) {
      if (!isFinal(error)) {
        left.push(end)
      }
    }
  }
  write(left)
}
