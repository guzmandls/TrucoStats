import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateLegacyGame } from './features/counter/gameStorage'
import { listenForInstall } from './features/install/install'

// Antes de dibujar la app: el aviso de Android para instalar llega apenas carga.
listenForInstall()

migrateLegacyGame()
  .catch(() => undefined)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

// Una app que quedó abierta en segundo plano puede seguir con el código viejo.
// Al volver a verla se compara con la versión publicada y, si cambió, se recarga.
if (import.meta.env.PROD) {
  const RELOADED_FOR = 'trucostats.reloadedFor'
  const scriptOf = (html: string) =>
    /\/assets\/index-[^"']+\.js/.exec(html)?.[0]
  const running = scriptOf(document.documentElement.innerHTML)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !running) {
      return
    }
    // "no-store": la respuesta viene siempre del servidor (el service worker no
    // la contesta con una copia guardada).
    fetch('/', { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        const latest = scriptOf(html)
        if (!latest || latest === running) {
          return
        }
        // Una sola recarga por versión nueva, aunque algo falle: nunca en bucle.
        try {
          if (sessionStorage.getItem(RELOADED_FOR) === latest) {
            return
          }
          sessionStorage.setItem(RELOADED_FOR, latest)
        } catch {
          // Sin almacenamiento se recarga igual (una vez por vuelta a la app).
        }
        window.location.reload()
      })
      .catch(() => undefined)
  })
}
