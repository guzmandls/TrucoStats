// Pantalla de inicio (está en index.html para verse desde el primer instante).
// Cuando la app ya se dibujó, se desvanece apenas termina la animación del logo:
// si la app tardó más que la animación, se va enseguida; si fue más rápida, solo
// espera lo que le falta a la animación, nunca más.

// La animación del logo dura 1,3 s; con el desvanecido (0,2 s) son 1,5 s.
const ANIMATION_SECONDS = 1.3
const FADE_MS = 200

export function finishSplash(doc: Document = document): void {
  const splash = doc.getElementById('splash')
  if (!splash || splash.dataset.finishing) {
    return
  }
  splash.dataset.finishing = 'true'
  const logo = doc.getElementById('splash-logo') as SVGSVGElement | null
  // Cuánto lleva la animación (el reloj propio del SVG). Si no se puede saber,
  // se da por terminada.
  const elapsed =
    logo && typeof logo.getCurrentTime === 'function'
      ? logo.getCurrentTime()
      : ANIMATION_SECONDS
  const remainingMs = Math.max(0, (ANIMATION_SECONDS - elapsed) * 1000)
  window.setTimeout(() => {
    splash.classList.add('splash-out')
    window.setTimeout(() => splash.remove(), FADE_MS)
  }, remainingMs)
}
