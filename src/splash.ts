// Pantalla de inicio (está en index.html para verse desde el primer instante):
// el logo sobre negro mientras carga la app. Cuando la app ya se dibujó, se
// desvanece y se elimina.
const FADE_MS = 200

export function finishSplash(doc: Document = document): void {
  const splash = doc.getElementById('splash')
  if (!splash || splash.dataset.finishing) {
    return
  }
  splash.dataset.finishing = 'true'
  splash.classList.add('splash-out')
  window.setTimeout(() => splash.remove(), FADE_MS)
}
