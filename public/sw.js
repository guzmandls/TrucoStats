// Cambiar el nombre borra la caché anterior al activarse. v1 guardaba también
// respuestas de /api (y las devolvía viejas para siempre): v2 la descarta. v3 y
// v4: íconos nuevos (los archivos sin huella en el nombre, como los íconos,
// quedan guardados hasta que cambia este nombre). v5: deja de guardar "/" (la
// app comparaba su versión con esa copia vieja y se recargaba sin motivo).
// Además, si la caché falla, la app se carga igual desde el servidor.
const CACHE = 'trucostats-v5'
const APP_SHELL = ['/index.html', '/manifest.webmanifest']

// Los archivos que usa una página (código, estilos, íconos), sacados de su HTML.
function assetsOf(html) {
  return [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith('/api/'))
}

// Guarda la página junto con todos sus archivos: así una página guardada nunca
// queda sin su código (si no, sin conexión se vería vacía y sin botones).
async function saveIndex(cache, response) {
  const html = await response.clone().text()
  await cache.addAll(assetsOf(html)).catch(() => undefined)
  await cache.put('/index.html', response)
}

// Lo guardado para ese pedido, o undefined. Si la caché no se puede usar (pasa en
// algunos celulares: almacenamiento lleno, modo privado), sigue como si no
// hubiera nada guardado: la app nunca deja de cargar por un problema de la caché.
async function fromCache(request) {
  try {
    const cache = await caches.open(CACHE)
    return await cache.match(request)
  } catch {
    return undefined
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  )
})

// Al activarse borra las cachés viejas. No recarga las pantallas abiertas:
// siguen funcionando con su código, y la app se actualiza sola al volver a ella
// (src/main.tsx).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }
  // Los datos (grupos, partidas, sesión) siempre van al servidor: nunca se
  // guardan ni se devuelven desde la caché. Lo mismo cualquier pedido que la app
  // hace con "no-store" (por ejemplo, para ver si hay una versión nueva).
  if (url.pathname.startsWith('/api/') || request.cache === 'no-store') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        let fresh
        try {
          fresh = await fetch(request)
        } catch {
          // Sin conexión: la página guardada (si se puede leer la caché).
          const cached = await fromCache('/index.html')
          return cached ?? Response.error()
        }
        if (fresh.ok) {
          event.waitUntil(
            caches
              .open(CACHE)
              .then((cache) => saveIndex(cache, fresh.clone()))
              .catch(() => undefined),
          )
        }
        return fresh
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await fromCache(request)
      if (cached) {
        return cached
      }
      const fresh = await fetch(request)
      if (fresh.ok) {
        event.waitUntil(
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, fresh.clone()))
            .catch(() => undefined),
        )
      }
      return fresh
    })(),
  )
})
