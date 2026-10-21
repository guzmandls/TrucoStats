import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddMemberDialog } from './AddMemberDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddMemberDialog', () => {
  it('agrega al integrante con el nombre escrito y avisa', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ member: {} }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const onAdded = vi.fn()
    render(
      <AddMemberDialog inviteCode="abc" onClose={() => {}} onAdded={onAdded} />,
    )

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Beto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/grupos/abc/integrantes')
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Beto' })
  })

  it('pide un nombre antes de enviar', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(
      <AddMemberDialog
        inviteCode="abc"
        onClose={() => {}}
        onAdded={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(
      screen.getByText('Escribe el nombre del integrante.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra el error del servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: 'Solo un administrador puede hacerlo' }),
            {
              status: 403,
            },
          ),
      ),
    )
    render(
      <AddMemberDialog
        inviteCode="abc"
        onClose={() => {}}
        onAdded={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Beto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(
      await screen.findByText('Solo un administrador puede hacerlo'),
    ).toBeInTheDocument()
  })
})
