// Cambiar el nombre borra la caché anterior al activarse. v1 guardaba también
// respuestas de /api (y las devolvía viejas para siempre): v2 la descarta. v3:
// íconos nuevos (los archivos sin huella en el nombre, como los íconos, quedan
// guardados hasta que cambia este nombre).
const CACHE = 'trucostats-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      const stale = keys.filter((key) => key !== CACHE)
      await Promise.all(stale.map((key) => caches.delete(key)))
      await self.clients.claim()
      // Si había una caché vieja, las pestañas abiertas pudieron recibir datos
      // viejos de ella: se recargan una vez para empezar limpias.
      if (stale.length > 0) {
        const windows = await self.clients.matchAll({ type: 'window' })
        await Promise.all(
          windows.map((client) =>
            client.navigate(client.url).catch(() => undefined),
          ),
        )
      }
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
  // guardan ni se devuelven desde la caché.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(CACHE)
          const cached = await cache.match('/index.html')
          return cached ?? Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)
      if (cached) {
        return cached
      }
      try {
        const fresh = await fetch(request)
        if (fresh.ok) {
          cache.put(request, fresh.clone())
        }
        return fresh
      } catch {
        return cached ?? Response.error()
      }
    })(),
  )
})
