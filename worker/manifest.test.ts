// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Env } from './groups'
import { request } from './testAuth'
import { createTestDb } from './testDb'

const env: Env = { DB: createTestDb() }

async function manifestAt(path: string) {
  const response = await request(env, path, { method: 'GET' })
  expect(response.headers.get('content-type')).toContain(
    'application/manifest+json',
  )
  return (await response.json()) as {
    id: string
    name: string
    start_url: string
    icons: unknown[]
  }
}

describe('manifiesto', () => {
  it('el de siempre arranca en el inicio', async () => {
    const manifest = await manifestAt('/manifest.webmanifest')
    expect(manifest.start_url).toBe('/')
    expect(manifest.name).toBe('trucoStats')
    expect(manifest.icons).toHaveLength(4)
  })

  it('el de una invitación arranca en la invitación, y es la misma app', async () => {
    const code = 'a'.repeat(32)
    const manifest = await manifestAt(`/api/manifiesto/${code}`)
    expect(manifest.start_url).toBe(`/unirse/${code}`)
    expect(manifest.id).toBe('/')
  })

  it('con un código inválido devuelve el de siempre', async () => {
    const manifest = await manifestAt('/api/manifiesto/no-es-un-codigo')
    expect(manifest.start_url).toBe('/')
  })
})
