import { useSyncExternalStore } from 'react'

// Instalar la app en la pantalla de inicio.
//
// - Android (Chrome): el navegador avisa con el evento `beforeinstallprompt` que
//   la app se puede instalar. Se guarda ese evento y, al tocar "Instalar", se
//   abre la ventana de instalación del sistema.
// - iPhone: Apple no deja que una página se instale sola; solo se pueden mostrar
//   los pasos para hacerlo desde Safari.

export type Platform = 'ios' | 'android' | 'other'

export function detectPlatform(
  userAgent = navigator.userAgent,
  touchPoints = navigator.maxTouchPoints ?? 0,
): Platform {
  // El iPad se presenta como una Mac, pero con pantalla táctil.
  if (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && touchPoints > 1)
  ) {
    return 'ios'
  }
  return /Android/.test(userAgent) ? 'android' : 'other'
}

// Abierta desde el ícono de la pantalla de inicio (no desde el navegador).
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let justInstalled = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

// Se llama una vez al arrancar: el aviso de Android llega una sola vez, apenas
// carga la página, y hay que guardarlo para usarlo cuando la persona toque.
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sin esto Chrome muestra su propio cartel; se usa el botón de la app.
    event.preventDefault()
    deferred = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    notify()
  })
}

// Abre la ventana de instalación de Android. Devuelve false si no se pudo abrir
// (otro navegador, el aviso ya se usó o el navegador la rechazó): entonces hay
// que mostrar los pasos.
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) {
    return false
  }
  // Cada aviso sirve una sola vez.
  deferred = null
  notify()
  try {
    await event.prompt()
    await event.userChoice
    return true
  } catch {
    return false
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstall(): {
  installed: boolean
  canPrompt: boolean
  platform: Platform
} {
  const installed = useSyncExternalStore(
    subscribe,
    () => justInstalled || isStandalone(),
  )
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null)
  return { installed, canPrompt, platform: detectPlatform() }
}

const CARD_CLOSED_KEY = 'trucostats.installCardClosed'

export function isInstallCardClosed(): boolean {
  try {
    return localStorage.getItem(CARD_CLOSED_KEY) === '1'
  } catch {
    return false
  }
}

export function closeInstallCard(): void {
  try {
    localStorage.setItem(CARD_CLOSED_KEY, '1')
  } catch {
    // Sin almacenamiento, la tarjeta vuelve a aparecer la próxima vez.
  }
}
