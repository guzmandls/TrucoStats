import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateGroupScreen } from './CreateGroupScreen'
import { deleteGroup, loadGroups } from './groupsStorage'
import { clearSession, saveSession } from '../../lib/session'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/crear-grupo']}>
      <Routes>
        <Route path="/crear-grupo" element={<CreateGroupScreen />} />
        <Route path="/" element={<LocationProbe />} />
        <Route path="/registrarse" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function memberInput(index: number): HTMLInputElement {
  return screen.getByLabelText(`Integrante ${index}`) as HTMLInputElement
}

async function location(): Promise<string> {
  await waitFor(() =>
    expect(screen.getByTestId('location')).toBeInTheDocument(),
  )
  return screen.getByTestId('location').textContent ?? ''
}

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('CreateGroupScreen', () => {
  beforeEach(async () => {
    for (const existing of await loadGroups()) {
      await deleteGroup(existing.id)
    }
    saveSession({
      token: 'a'.repeat(64),
      user: { id: 'u1', username: 'juan', email: null, name: 'juan' },
    })
  })

  it('pide registrarse si no hay una cuenta registrada', async () => {
    clearSession()
    renderScreen()
    expect(await location()).toBe('/registrarse')
  })

  it('pide registrarse si la cuenta es invitada', async () => {
    saveSession({
      token: 'b'.repeat(64),
      user: { id: 'u2', username: null, email: null, name: 'Pedro' },
    })
    renderScreen()
    expect(await location()).toBe('/registrarse')
  })

  it('sugiere el usuario como nombre del primer integrante, editable', () => {
    renderScreen()
    expect(memberInput(1)).toHaveValue('juan')
    expect(memberInput(1)).not.toHaveAttribute('readonly')
  })

  it('vuelve al home con el botón de la barra cuando no hay datos', async () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await location()).toBe('/')
  })

  it('muestra dos integrantes al empezar', () => {
    renderScreen()
    expect(screen.getByLabelText('Nombre del grupo')).toBeInTheDocument()
    expect(memberInput(1)).toBeInTheDocument()
    expect(memberInput(2)).toBeInTheDocument()
    expect(screen.queryByLabelText('Integrante 3')).not.toBeInTheDocument()
  })

  it('coloca el contenido en el bloque de contenido compartido', () => {
    renderScreen()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByLabelText('Nombre del grupo'),
    )
  })

  it('agrega y quita integrantes con los botones', async () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar integrante' }))
    expect(memberInput(3)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar integrante' }))
    await waitFor(() =>
      expect(screen.queryByLabelText('Integrante 3')).not.toBeInTheDocument(),
    )
    expect(memberInput(1)).toBeInTheDocument()
  })

  it('no baja de un integrante pero no limita el máximo', () => {
    renderScreen()
    const remove = screen.getByRole('button', { name: 'Quitar integrante' })
    const add = screen.getByRole('button', { name: 'Agregar integrante' })

    fireEvent.click(remove)
    expect(screen.queryByLabelText('Integrante 2')).not.toBeInTheDocument()
    expect(remove).toBeDisabled()

    for (let i = 0; i < 20; i += 1) {
      fireEvent.click(add)
    }
    expect(screen.getByLabelText('Integrante 21')).toBeInTheDocument()
    expect(add).not.toBeDisabled()
  })

  it('registra el grupo en el servidor y guarda su código de invitación', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ inviteCode: 'abc123' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Los del truco' },
    })
    fireEvent.change(memberInput(2), { target: { value: 'Pedro' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await location()).toBe('/')

    await waitFor(async () =>
      expect((await loadGroups())[0].inviteCode).toBe('abc123'),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('guarda el grupo igual si no hay conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('sin red'))),
    )
    renderScreen()
    fireEvent.change(memberInput(2), { target: { value: 'Pedro' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await location()).toBe('/')

    const groups = await loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].inviteCode).toBeUndefined()
  })

  it('exige el nombre de cada integrante', () => {
    renderScreen()

    expect(memberInput(2)).toBeRequired()
  })

  it('guarda el grupo y vuelve al home', async () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Los del truco' },
    })
    fireEvent.change(memberInput(1), { target: { value: 'Juan' } })
    fireEvent.change(memberInput(2), { target: { value: 'Pedro' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar grupo' }))
    expect(await location()).toBe('/')

    const groups = await loadGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Los del truco')
    expect(groups[0].members.map((member) => member.name)).toEqual([
      'Juan',
      'Pedro',
    ])
    expect(groups[0].adminMemberIds).toEqual([groups[0].members[0].id])
  })

  it('pide confirmación antes de cancelar con datos escritos', () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Borrador' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '¿Quieres cancelar la creación del grupo?',
    )
  })

  it('sigue en la pantalla si no confirma la cancelación', () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Borrador' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del grupo')).toHaveValue('Borrador')
  })

  it('descarta la creación al confirmar y no guarda nada', async () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Borrador' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(await location()).toBe('/')
    expect(await loadGroups()).toHaveLength(0)
  })

  it('confirma al volver desde la barra con datos escritos', () => {
    renderScreen()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Borrador' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
