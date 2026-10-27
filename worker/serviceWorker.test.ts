// @vitest-environment node
// Prueba public/sw.js (el service worker de la app). Está acá porque necesita
// las herramientas de Node para cargarlo.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

// Carga public/sw.js en un entorno falso y devuelve sus listeners.
function loadServiceWorker(
  existingCaches: string[] = [],
  { brokenCache = false } = {},
) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const deleted: string[] = []
  const navigated: string[] = []
  const added: string[][] = []
  const put: string[] = []
  const self = {
    location: { origin: 'https://trucostats.test' },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners[type] = listener
    },
    skipWaiting: vi.fn(),
    clients: {
      claim: async () => undefined,
      matchAll: async () => [
        {
          url: 'https://trucostats.test/grupo/g1',
          navigate: async (url: string) => navigated.push(url),
        },
      ],
    },
  }
  const caches = {
    keys: async () => existingCaches,
    delete: async (key: string) => deleted.push(key),
    open: async () => {
      // Como en algunos celulares (almacenamiento lleno, modo privado): abrir la
      // caché falla.
      if (brokenCache) {
        throw new Error('UnknownError: Unexpected internal error')
      }
      return cacheApi
    },
  }
  const cacheApi = {
    match: async () => undefined,
    put: async (key: string) => put.push(key),
    addAll: async (paths: string[]) => added.push(paths),
  }
  const page =
    '<html><head><link rel="icon" href="/favicon.ico" /><link rel="stylesheet" crossorigin href="/assets/index-b.css"></head>' +
    '<body><script type="module" crossorigin src="/assets/index-b.js"></script></body></html>'
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self,
    caches,
    URL,
    Response,
    fetch: async () => new Response(page),
  })
  return { listeners, deleted, navigated, added, put }
}

function fetchEvent(path: string, extra: Record<string, unknown> = {}) {
  return {
    request: {
      method: 'GET',
      url: `https://trucostats.test${path}`,
      mode: 'cors',
      cache: 'default',
      ...extra,
    },
    respondWith: vi.fn(),
    waitUntil: vi.fn(),
  }
}

function activate(listeners: Record<string, (event: unknown) => void>) {
  let done: Promise<unknown> = Promise.resolve()
  listeners.activate({
    waitUntil: (promise: Promise<unknown>) => {
      done = promise
    },
  })
  return done
}

describe('service worker', () => {
  it('no responde los pedidos a la API: siempre van al servidor', () => {
    const { listeners } = loadServiceWorker()
    for (const path of [
      '/api/grupos/abc',
      '/api/grupos/abc/partidas',
      '/api/yo',
      '/api/mis-grupos',
    ]) {
      const event = fetchEvent(path)
      listeners.fetch(event)
      expect(event.respondWith).not.toHaveBeenCalled()
    }
  })

  it('no responde los pedidos "no-store" (ver si hay versión nueva): van al servidor', () => {
    const { listeners } = loadServiceWorker()
    const event = fetchEvent('/', { cache: 'no-store' })
    listeners.fetch(event)
    expect(event.respondWith).not.toHaveBeenCalled()
  })

  it('sigue sirviendo los archivos de la app desde la caché', () => {
    const { listeners } = loadServiceWorker()
    const event = fetchEvent('/assets/index-abc.js')
    listeners.fetch(event)
    expect(event.respondWith).toHaveBeenCalled()
  })

  it('al abrir una página guarda también todos sus archivos', async () => {
    const { listeners, added, put } = loadServiceWorker()
    const event = fetchEvent('/grupo/g1', { mode: 'navigate' })
    listeners.fetch(event)

    await (event.respondWith.mock.calls[0][0] as Promise<Response>)
    await (event.waitUntil.mock.calls[0][0] as Promise<unknown>)

    expect(added).toContainEqual([
      '/favicon.ico',
      '/assets/index-b.css',
      '/assets/index-b.js',
    ])
    expect(put).toEqual(['/index.html'])
  })

  it('al activarse borra las cachés viejas, pero no recarga las pantallas abiertas', async () => {
    const { listeners, deleted, navigated } = loadServiceWorker([
      'trucostats-v3',
      'trucostats-v4',
      'trucostats-v5',
    ])
    await activate(listeners)
    expect(deleted).toEqual(['trucostats-v3', 'trucostats-v4'])
    expect(navigated).toEqual([])
  })

  it('ya no guarda "/" entre los archivos de la app', async () => {
    const { listeners, added } = loadServiceWorker()
    let done: Promise<unknown> = Promise.resolve()
    listeners.install({
      waitUntil: (promise: Promise<unknown>) => {
        done = promise
      },
    })
    await done
    expect(added[0]).toEqual(['/index.html', '/manifest.webmanifest'])
  })

  it('con la caché rota, igual muestra la página que mandó el servidor', async () => {
    const { listeners } = loadServiceWorker([], { brokenCache: true })
    const event = fetchEvent('/iniciar-sesion', { mode: 'navigate' })
    listeners.fetch(event)
    const response = (await event.respondWith.mock.calls[0][0]) as Response
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<html>')
  })

  it('con la caché rota, igual entrega los archivos de la app', async () => {
    const { listeners } = loadServiceWorker([], { brokenCache: true })
    const event = fetchEvent('/assets/fuente.woff2')
    listeners.fetch(event)
    const response = (await event.respondWith.mock.calls[0][0]) as Response
    expect(response.status).toBe(200)
  })
})
