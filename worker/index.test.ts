import { describe, expect, it } from 'vitest'
import worker from './index'

function get(path: string): Promise<Response> {
  return worker.fetch(new Request(`https://trucostats.test${path}`))
}

describe('worker', () => {
  it('responde ok en /api/salud', async () => {
    const response = await get('/api/salud')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ estado: 'ok' })
  })

  it('responde 404 en una ruta de la API que no existe', async () => {
    const response = await get('/api/inexistente')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No encontrado' })
  })
})
