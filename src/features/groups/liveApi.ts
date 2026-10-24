import { apiRequest, deleteRequest } from '../../lib/api'
import type { Team } from '../counter/counterLogic'
import type { Participant } from '../matches/types'

// Cómo va una partida de grupo, tal como la publica el contador para que los
// demás integrantes la miren.
export interface LiveState {
  teams: Record<Team, Participant[]>
  target: number
  scores: Record<Team, number>
  paused: boolean
  // Segundos de juego en el momento de publicar (sin contar pausas).
  elapsedSeconds: number
  // Equipo que ya llegó al objetivo, a la espera de confirmar el resultado.
  winner: Team | null
}

export type LiveStatus = 'live' | 'finished' | 'canceled'

export interface LiveMatch {
  // Identifica la partida (puede haber varias en vivo a la vez en un grupo).
  id: string
  state: LiveState
  startedAt: string
  updatedAt: string
  // Hace cuántos segundos se actualizó, según el reloj del servidor. Si el
  // contador sigue abierto se actualiza cada pocos segundos.
  ageSeconds: number
  // En juego, terminada o cancelada (las dos últimas se muestran un rato).
  status: LiveStatus
  endedAt: string | null
  // Motivo de la cancelación, si lo escribió quien la canceló.
  reason: string | null
}

export interface PublishOptions {
  status?: LiveStatus
  reason?: string
  // Para publicar justo al cerrar la pantalla, cuando el navegador podría
  // cortar el pedido.
  keepalive?: boolean
}

// El contador publica (o actualiza) la partida en curso del grupo.
export async function publishLive(
  inviteCode: string,
  liveId: string,
  state: LiveState,
  options: PublishOptions = {},
): Promise<void> {
  await apiRequest(`/api/grupos/${inviteCode}/en-vivo/${liveId}`, {
    method: 'PUT',
    body: JSON.stringify({
      state,
      ...(options.status ? { status: options.status } : {}),
      ...(options.reason ? { reason: options.reason } : {}),
    }),
    ...(options.keepalive ? { keepalive: true } : {}),
  })
}

// La partida en vivo se borra sin dejar rastro (se salió del contador sin jugar).
export async function stopLive(
  inviteCode: string,
  liveId: string,
): Promise<void> {
  await deleteRequest(`/api/grupos/${inviteCode}/en-vivo/${liveId}`)
}

// Las partidas en vivo del grupo (vacío si no hay ninguna).
export async function fetchLive(inviteCode: string): Promise<LiveMatch[]> {
  const response = await apiRequest<{ live: LiveMatch[] }>(
    `/api/grupos/${inviteCode}/en-vivo`,
  )
  return response.live
}

// Partida rápida compartida en vivo: quien cuenta (con cuenta) la publica y
// cualquiera con el enlace la mira, sin cuenta.
export async function publishShared(
  shareId: string,
  state: LiveState,
  options: PublishOptions = {},
): Promise<void> {
  await apiRequest(`/api/en-vivo/${shareId}`, {
    method: 'PUT',
    body: JSON.stringify({
      state,
      ...(options.status ? { status: options.status } : {}),
      ...(options.reason ? { reason: options.reason } : {}),
    }),
    ...(options.keepalive ? { keepalive: true } : {}),
  })
}

export async function fetchShared(shareId: string): Promise<LiveMatch> {
  const response = await apiRequest<{ live: LiveMatch }>(
    `/api/en-vivo/${shareId}`,
  )
  return response.live
}

// Enlace para mirar la partida compartida (el que lleva el QR).
export function sharedLink(shareId: string): string {
  return `${window.location.origin}/en-vivo/${shareId}`
}
