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
  const scriptOf = (html: string) =>
    /\/assets\/index-[^"']+\.js/.exec(html)?.[0]
  const running = scriptOf(document.documentElement.innerHTML)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !running) {
      return
    }
    fetch('/', { cache: 'no-store' })
      .then((response) => response.text())
      .then((html) => {
        const latest = scriptOf(html)
        if (latest && latest !== running) {
          window.location.reload()
        }
      })
      .catch(() => undefined)
  })
}
