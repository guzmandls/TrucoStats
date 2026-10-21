import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JoinGroupScreen } from './JoinGroupScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { clearMembership, loadMembership } from './membership'
import type { Group } from './types'

const CODE = 'abc123'

const remoteGroup: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberId: 'm1',
  createdAt: '2026-10-01T10:00:00.000Z',
  members: [
    { id: 'm1', name: 'Juan' },
    { id: 'm2', name: 'Pedro' },
    { id: 'm3', name: 'Luis' },
  ],
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={[`/unirse/${CODE}`]}>
      <Routes>
        <Route path="/unirse/:code" element={<JoinGroupScreen />} />
        <Route path="/grupo/:id" element={<LocationProbe />} />
        <Route path="/" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

function stubServer(handler: Handler) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    handler(url, init),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const serverWithGroup: Handler = (url, init) => {
  if (init?.method === 'PATCH') {
    return json({ member: { id: 'm2', name: 'x' } })
  }
  return url === `/api/grupos/${CODE}`
    ? json({ group: remoteGroup, inviteCode: CODE })
    : json({ error: 'No encontrado' }, 404)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JoinGroupScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    clearMembership()
  })

  it('pregunta cuál de los integrantes es la persona', async () => {
    stubServer(serverWithGroup)
    renderJoin()

    expect(
      await screen.findByText('¿Cuál de los integrantes de “Los pibes” eres?'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('radio').map((radio) => radio.textContent),
    ).toEqual(['Juan', 'Pedro', 'Luis'])
    expect(
      screen.getByRole('button', { name: 'Unirme al grupo' }),
    ).toBeDisabled()
  })

  it('al elegir un integrante muestra su nombre para poder cambiarlo', async () => {
    stubServer(serverWithGroup)
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))

    expect(screen.getByLabelText('Tu nombre')).toHaveValue('Pedro')
    expect(screen.getByRole('radio', { name: 'Pedro' })).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'Unirme al grupo' }),
    ).toBeEnabled()
  })

  it('se une con el nombre original sin pedirle nada más al servidor', async () => {
    const fetchMock = stubServer(serverWithGroup)
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/grupo/g1'),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [saved] = await loadGroups()
    expect(saved.myMemberId).toBe('m2')
    expect(saved.inviteCode).toBe(CODE)
    expect(loadMembership()).toContain('g1')
  })

  it('cambia el nombre del integrante en el servidor y en el celular', async () => {
    const fetchMock = stubServer(serverWithGroup)
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.change(screen.getByLabelText('Tu nombre'), {
      target: { value: '  Pedrito ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/grupo/g1'),
    )
    const [url, init] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe(`/api/grupos/${CODE}/integrantes/m2`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Pedrito' })
    const [saved] = await loadGroups()
    expect(saved.members.map((member) => member.name)).toEqual([
      'Juan',
      'Pedrito',
      'Luis',
    ])
  })

  it('no deja unirse con el nombre vacío', async () => {
    stubServer(serverWithGroup)
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.change(screen.getByLabelText('Tu nombre'), {
      target: { value: '   ' },
    })

    expect(
      screen.getByRole('button', { name: 'Unirme al grupo' }),
    ).toBeDisabled()
  })

  it('no guarda el grupo si falla el cambio de nombre', async () => {
    stubServer((url, init) =>
      init?.method === 'PATCH'
        ? Promise.reject(new TypeError('sin red'))
        : serverWithGroup(url, init),
    )
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.change(screen.getByLabelText('Tu nombre'), {
      target: { value: 'Pedrito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    expect(
      await screen.findByText(/No se pudo unir al grupo/),
    ).toBeInTheDocument()
    expect(await loadGroups()).toEqual([])
    expect(
      screen.getByRole('button', { name: 'Unirme al grupo' }),
    ).toBeEnabled()
  })

  it('abre el grupo directamente si ya está en este celular', async () => {
    await saveGroup({ ...remoteGroup, inviteCode: CODE, myMemberId: 'm1' })
    stubServer(serverWithGroup)
    renderJoin()

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/grupo/g1'),
    )
  })

  it('avisa si el código no corresponde a ningún grupo', async () => {
    stubServer(() => json({ error: 'Grupo no encontrado' }, 404))
    renderJoin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se encontró el grupo',
    )
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('avisa que hace falta conexión y permite reintentar', async () => {
    let online = false
    stubServer((url, init) =>
      online
        ? serverWithGroup(url, init)
        : Promise.reject(new TypeError('sin red')),
    )
    renderJoin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Necesitas conexión a Internet',
    )

    online = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findAllByRole('radio')).toHaveLength(3)
  })
})
