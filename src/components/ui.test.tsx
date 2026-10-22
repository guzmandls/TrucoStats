import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  Button,
  ButtonLink,
  CardLink,
  ConfirmDialog,
  Field,
  HeaderIconButton,
  HeaderIconLink,
  PageHeader,
  Panel,
  PanelHeader,
  Rows,
  Screen,
  ScreenContent,
  ScreenFooter,
  SectionTitle,
  Stepper,
  TextInput,
} from './ui'

function wrap(ui: ReactElement) {
  return <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
}

describe('PageHeader', () => {
  it('muestra el título como heading principal', () => {
    render(<PageHeader title="trucoStats" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'trucoStats' }),
    ).toBeInTheDocument()
  })

  it('muestra el contenido de la derecha', () => {
    render(<PageHeader title="trucoStats" trailing={<button>Nuevo</button>} />)
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('button', { name: 'Nuevo' }),
    )
  })

  it('muestra el contenido de la izquierda', () => {
    render(<PageHeader title="Crear grupo" leading={<button>Volver</button>} />)
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('button', { name: 'Volver' }),
    )
  })
})

describe('HeaderIconLink', () => {
  it('es un enlace con el nombre accesible dado', () => {
    render(
      wrap(
        <HeaderIconLink label="Crear grupo" to="/crear-grupo">
          +
        </HeaderIconLink>,
      ),
    )
    expect(screen.getByRole('link', { name: 'Crear grupo' })).toHaveAttribute(
      'href',
      '/crear-grupo',
    )
  })
})

describe('SectionTitle', () => {
  it('muestra el título como heading de sección', () => {
    render(<SectionTitle>Grupos</SectionTitle>)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Grupos' }),
    ).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('ejecuta onClick y respeta el estado deshabilitado', () => {
    const onClick = vi.fn()
    render(
      <>
        <Button onClick={onClick}>Anotar</Button>
        <Button disabled>Guardando</Button>
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Guardando' })).toBeDisabled()
  })
})

describe('ButtonLink', () => {
  it('renderiza un enlace con el destino', () => {
    render(wrap(<ButtonLink to="/partida">Partida rápida</ButtonLink>))
    expect(
      screen.getByRole('link', { name: 'Partida rápida' }),
    ).toHaveAttribute('href', '/partida')
  })
})

describe('CardLink', () => {
  it('muestra el nombre y el dato secundario', () => {
    render(
      wrap(
        <CardLink to="/grupo/g1" meta="4 integrantes">
          Los del truco
        </CardLink>,
      ),
    )
    const link = screen.getByRole('link', { name: /Los del truco/ })
    expect(link).toHaveAttribute('href', '/grupo/g1')
    expect(link).toHaveTextContent('Los del truco')
    expect(link).toHaveTextContent('4 integrantes')
  })

  it('oculta la flecha cuando chevron es false', () => {
    render(
      wrap(
        <CardLink to="/grupo/g1" chevron={false}>
          Sin flecha
        </CardLink>,
      ),
    )
    expect(screen.queryByText('›')).not.toBeInTheDocument()
  })
})

describe('Field', () => {
  it('asocia la etiqueta con el campo', () => {
    const onChange = vi.fn()
    render(
      <Field label="Nombre del grupo">
        <TextInput value="" onChange={onChange} />
      </Field>,
    )
    const input = screen.getByLabelText('Nombre del grupo')
    fireEvent.change(input, { target: { value: 'Los del truco' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('Panel', () => {
  it('muestra la cabecera como título de nivel 2', () => {
    render(
      <Panel>
        <PanelHeader>Nombre del grupo</PanelHeader>
        <TextInput aria-label="Nombre del grupo" />
      </Panel>,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nombre del grupo' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del grupo')).toBeInTheDocument()
  })
})

describe('Rows', () => {
  it('contiene sus filas', () => {
    render(
      <Rows>
        <span>Integrante 1</span>
        <span>Integrante 2</span>
      </Rows>,
    )
    expect(screen.getByText('Integrante 1')).toBeInTheDocument()
    expect(screen.getByText('Integrante 2')).toBeInTheDocument()
  })
})

describe('Stepper', () => {
  function renderStepper(value: number, min = 1, max = 15) {
    const onDecrease = vi.fn()
    const onIncrease = vi.fn()
    render(
      <Stepper
        value={value}
        min={min}
        max={max}
        decreaseLabel="Eliminar"
        increaseLabel="Agregar"
        onDecrease={onDecrease}
        onIncrease={onIncrease}
      />,
    )
    return { onDecrease, onIncrease }
  }

  it('muestra el valor y ejecuta los incrementos', () => {
    const { onDecrease, onIncrease } = renderStepper(3)
    expect(screen.getByText('3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(onIncrease).toHaveBeenCalledTimes(1)
    expect(onDecrease).toHaveBeenCalledTimes(1)
  })

  it('deshabilita quitar cuando llega al mínimo', () => {
    renderStepper(1, 1, 2)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
  })

  it('deshabilita agregar cuando llega al máximo', () => {
    renderStepper(2, 1, 2)
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeEnabled()
  })
})

describe('ScreenFooter', () => {
  it('es una barra de pie con su contenido', () => {
    render(
      <ScreenFooter>
        <span>Partida rápida</span>
      </ScreenFooter>,
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Partida rápida')
  })
})

describe('HeaderIconButton', () => {
  it('es un botón con el nombre accesible dado', () => {
    const onClick = vi.fn()
    render(
      <HeaderIconButton label="Volver" onClick={onClick}>
        ‹
      </HeaderIconButton>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  function renderDialog() {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="¿Quieres cancelar la creación del grupo?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    return { onConfirm, onCancel }
  }

  it('muestra la pregunta con los botones Sí y No', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('¿Quieres cancelar la creación del grupo?')
    expect(screen.getByRole('button', { name: 'Sí' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
  })

  it('ejecuta confirmar o cancelar según el botón', () => {
    const { onConfirm, onCancel } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancela con la tecla Escape', () => {
    const { onCancel } = renderDialog()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('Screen', () => {
  it('envuelve la pantalla con su cabecera, contenido y pie', () => {
    render(
      <Screen>
        <PageHeader title="trucoStats" />
        <ScreenContent>
          <span>Contenido</span>
        </ScreenContent>
        <ScreenFooter>
          <span>Acción</span>
        </ScreenFooter>
      </Screen>,
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Contenido')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Acción')
  })
})

describe('ScreenContent', () => {
  it('es el bloque de contenido principal compartido', () => {
    render(
      <ScreenContent>
        <span>Primer elemento</span>
      </ScreenContent>,
    )
    expect(screen.getByRole('main')).toHaveTextContent('Primer elemento')
  })
})
