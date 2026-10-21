import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JoinGroupScreen } from './JoinGroupScreen'
import { deleteGroup, loadGroups, saveGroup } from './groupsStorage'
import { clearSession, getSession } from '../../lib/session'
import { clearMembership, loadMembership } from './membership'
import type { Group } from './types'

const CODE = 'abc123'

const remoteGroup: Group = {
  id: 'g1',
  name: 'Los pibes',
  adminMemberIds: ['m1'],
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

const guest = { id: 'u9', username: null, email: null, name: 'Pedro' }

const serverWithGroup: Handler = (url, init) => {
  if (init?.method === 'POST') {
    return json({
      user: guest,
      token: 't'.repeat(64),
      memberId: 'm2',
      member: { id: 'm2', name: 'x' },
    })
  }
  return url === `/api/grupos/${CODE}`
    ? json({
        group: remoteGroup,
        inviteCode: CODE,
        claimedMemberIds: ['m1'],
        myMemberId: null,
      })
    : json({ error: 'No encontrado' }, 404)
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
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
    ).toEqual(['JuanYa elegido', 'Pedro', 'Luis'])
    expect(
      screen.getByRole('button', { name: 'Unirme al grupo' }),
    ).toBeDisabled()
  })

  it('guarda los apodos con los que anotaron antes a la persona', async () => {
    const calls: { method: string; url: string; body: string | null }[] = []
    stubServer((url, init) => {
      calls.push({
        method: init?.method ?? 'GET',
        url,
        body: (init?.body as string) ?? null,
      })
      return init?.method === 'PUT'
        ? json({ aliases: [] })
        : serverWithGroup(url, init)
    })
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.change(screen.getByLabelText('Apodos'), {
      target: { value: ' Pedrito, pepe ,Pedrito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/grupo/g1')
    expect(calls).toContainEqual({
      method: 'PUT',
      url: `/api/grupos/${CODE}/integrantes/m2/apodos`,
      body: JSON.stringify({ aliases: ['Pedrito', 'pepe'] }),
    })
    const [saved] = await loadGroups()
    expect(saved.members.find((member) => member.id === 'm2')?.aliases).toEqual(
      ['Pedrito', 'pepe'],
    )
  })

  it('no entra al grupo si el servidor rechaza un apodo', async () => {
    stubServer((url, init) =>
      init?.method === 'PUT'
        ? json({ error: 'El apodo “Pepe” ya lo tiene otro integrante' }, 409)
        : serverWithGroup(url, init),
    )
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.change(screen.getByLabelText('Apodos'), {
      target: { value: 'Pepe' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    expect(
      await screen.findByText('El apodo “Pepe” ya lo tiene otro integrante'),
    ).toBeInTheDocument()
    expect(await loadGroups()).toEqual([])
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

  it('se une con el nombre original y guarda la cuenta invitada', async () => {
    const fetchMock = stubServer(serverWithGroup)
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/grupo/g1'),
    )
    const [url, init] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe(`/api/grupos/${CODE}/unirse`)
    expect(JSON.parse(init.body as string)).toEqual({
      memberId: 'm2',
      name: 'Pedro',
    })
    expect(getSession()).toEqual({ token: 't'.repeat(64), user: guest })
    const [saved] = await loadGroups()
    expect(saved.myMemberId).toBe('m2')
    expect(saved.inviteCode).toBe(CODE)
    expect(loadMembership()).toContain('g1')
  })

  it('envía el nombre nuevo al servidor y lo guarda en el celular', async () => {
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
    expect(url).toBe(`/api/grupos/${CODE}/unirse`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      memberId: 'm2',
      name: 'Pedrito',
    })
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

  it('no guarda el grupo si falla el pedido de unirse', async () => {
    stubServer((url, init) =>
      init?.method === 'POST'
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

  it('no deja elegir a un integrante que ya eligió otra persona', async () => {
    stubServer(serverWithGroup)
    renderJoin()

    const taken = await screen.findByRole('radio', { name: /Juan/ })
    expect(taken).toBeDisabled()
    expect(taken).toHaveTextContent('Ya elegido')
    expect(screen.getByRole('radio', { name: 'Pedro' })).toBeEnabled()
  })

  it('muestra el aviso del servidor si el integrante ya lo eligieron', async () => {
    stubServer((url, init) =>
      init?.method === 'POST'
        ? json({ error: 'Ese integrante ya fue elegido por otra persona' }, 409)
        : serverWithGroup(url, init),
    )
    renderJoin()

    fireEvent.click(await screen.findByRole('radio', { name: 'Pedro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al grupo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese integrante ya fue elegido por otra persona',
    )
    expect(await loadGroups()).toEqual([])
  })

  it('abre el grupo sin preguntar si el servidor ya sabe quién es la persona', async () => {
    stubServer((url, init) =>
      init?.method === 'POST'
        ? serverWithGroup(url, init)
        : json({
            group: remoteGroup,
            inviteCode: CODE,
            claimedMemberIds: ['m1', 'm2'],
            myMemberId: 'm2',
          }),
    )
    renderJoin()

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/grupo/g1'),
    )
    const [saved] = await loadGroups()
    expect(saved.myMemberId).toBe('m2')
    expect(loadMembership()).toContain('g1')
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
