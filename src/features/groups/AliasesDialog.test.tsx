import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AliasesDialog } from './AliasesDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderDialog(onSaved = () => {}) {
  return render(
    <AliasesDialog
      inviteCode="abc"
      memberId="m1"
      memberName="Juan"
      aliases={['Juancho']}
      onClose={() => {}}
      onSaved={onSaved}
    />,
  )
}

describe('AliasesDialog', () => {
  it('muestra los apodos actuales y guarda la lista editada', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ aliases: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()
    renderDialog(onSaved)

    expect(screen.getByLabelText('Apodos')).toHaveValue('Juancho')
    fireEvent.change(screen.getByLabelText('Apodos'), {
      target: { value: 'Juancho, Juanito' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(path).toBe('/api/grupos/abc/integrantes/m1/apodos')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({
      aliases: ['Juancho', 'Juanito'],
    })
  })

  it('muestra el error del servidor (un apodo de otro integrante)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: 'El apodo “Juancho” ya lo tiene otro integrante',
            }),
            { status: 409 },
          ),
      ),
    )
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('El apodo “Juancho” ya lo tiene otro integrante'),
    ).toBeInTheDocument()
  })
})
