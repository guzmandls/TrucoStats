import { useMemo, useSyncExternalStore } from 'react'

// Sesión de la persona en este celular: el token que entrega el servidor y los
// datos de su cuenta. Sin sesión, la app funciona igual para lo que no exige
// cuenta (contador y partida rápida).

export interface Account {
  id: string
  // null en una cuenta invitada (la que se crea al unirse a un grupo).
  username: string | null
  email: string | null
  name: string
}

export interface Session {
  token: string
  user: Account
}

const STORAGE_KEY = 'trucostats.session'
const EXPIRED_KEY = 'trucostats.sessionExpired'
const CHANGE_EVENT = 'trucostats:session'

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const session = value as { token?: unknown; user?: unknown }
  const user = session.user as Record<string, unknown> | null
  return (
    typeof session.token === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.name === 'string'
  )
}

// Se guarda el texto tal cual para poder compararlo sin crear objetos nuevos
// en cada lectura (lo que necesita useSyncExternalStore).
function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): Session | null {
  if (!raw) {
    return null
  }
  try {
    const value: unknown = JSON.parse(raw)
    return isSession(value) ? value : null
  } catch {
    return null
  }
}

export function getSession(): Session | null {
  return parse(readRaw())
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

// Una cuenta registrada tiene usuario; la invitada no.
export function isRegistered(session: Session | null): boolean {
  return session?.user.username != null
}

function readExpired(): boolean {
  try {
    return localStorage.getItem(EXPIRED_KEY) === '1'
  } catch {
    return false
  }
}

// El servidor rechazó el token (venció o ya no es válido): se recuerda para
// avisarle a la persona que inicie sesión de nuevo.
export function markSessionExpired(): void {
  if (!getToken() || readExpired()) {
    return
  }
  try {
    localStorage.setItem(EXPIRED_KEY, '1')
  } catch {
    // Sin almacenamiento no se puede recordar el aviso.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    localStorage.removeItem(EXPIRED_KEY)
  } catch {
    // Sin almacenamiento la sesión no se puede recordar: se pedirá de nuevo.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(EXPIRED_KEY)
  } catch {
    // Nada que borrar.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// true si hay una sesión guardada que el servidor ya no acepta.
export function useSessionExpired(): boolean {
  const expired = useSyncExternalStore(subscribe, readExpired, () => false)
  return expired && getToken() !== null
}

// Sesión actual; la pantalla se actualiza sola al iniciar o cerrar sesión.
export function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  return useMemo(() => parse(raw), [raw])
}
