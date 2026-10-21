import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RenameMemberDialog } from './RenameMemberDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderDialog(onSaved = () => {}) {
  return render(
    <RenameMemberDialog
      inviteCode="abc"
      memberId="m2"
      currentName="Pedro"
      onClose={() => {}}
      onSaved={onSaved}
    />,
  )
}

describe('RenameMemberDialog', () => {
  it('muestra el nombre actual y guarda el nuevo', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ member: {} }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()
    renderDialog(onSaved)

    expect(screen.getByLabelText('Nombre')).toHaveValue('Pedro')
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Pedrito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/grupos/abc/integrantes/m2')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Pedrito' })
  })

  it('no envía un nombre vacío', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderDialog()

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: '  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Escribe un nombre.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra el error del servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'No tienes permiso' }), {
            status: 403,
          }),
      ),
    )
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument()
  })
})
