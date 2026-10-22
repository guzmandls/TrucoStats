// @vitest-environment node
// Prueba public/sw.js (el service worker de la app). Está acá porque necesita
// las herramientas de Node para cargarlo.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

// Carga public/sw.js en un entorno falso y devuelve sus listeners.
function loadServiceWorker(existingCaches: string[] = []) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const deleted: string[] = []
  const navigated: string[] = []
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
    open: async () => ({
      match: async () => undefined,
      put: async () => undefined,
      addAll: async () => undefined,
    }),
  }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self,
    caches,
    URL,
    Response,
    fetch: async () => new Response('ok'),
  })
  return { listeners, deleted, navigated }
}

function fetchEvent(path: string) {
  return {
    request: {
      method: 'GET',
      url: `https://trucostats.test${path}`,
      mode: 'cors',
    },
    respondWith: vi.fn(),
  }
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

  it('sigue sirviendo los archivos de la app desde la caché', () => {
    const { listeners } = loadServiceWorker()
    const event = fetchEvent('/assets/index-abc.js')
    listeners.fetch(event)
    expect(event.respondWith).toHaveBeenCalled()
  })

  it('al activarse borra la caché vieja (con datos viejos) y recarga las pestañas', async () => {
    const { listeners, deleted, navigated } = loadServiceWorker([
      'trucostats-v1',
      'trucostats-v2',
      'trucostats-v3',
    ])
    let done: Promise<unknown> = Promise.resolve()
    listeners.activate({
      waitUntil: (promise: Promise<unknown>) => {
        done = promise
      },
    })
    await done
    expect(deleted).toEqual(['trucostats-v1', 'trucostats-v2'])
    expect(navigated).toEqual(['https://trucostats.test/grupo/g1'])
  })

  it('si no había caché vieja no recarga nada', async () => {
    const { listeners, navigated } = loadServiceWorker(['trucostats-v3'])
    let done: Promise<unknown> = Promise.resolve()
    listeners.activate({
      waitUntil: (promise: Promise<unknown>) => {
        done = promise
      },
    })
    await done
    expect(navigated).toEqual([])
  })
})
