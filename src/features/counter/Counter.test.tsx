import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { GameContext } from './gameContext'
import { CounterScreen } from './CounterScreen'

const groupContext: GameContext = {
  type: 'group',
  groupId: 'g1',
  modality: '2v2',
  teams: {
    nos: [
      { id: 'p1', name: 'Juan' },
      { id: 'p2', name: 'Pedro' },
    ],
    ellos: [
      { id: 'p3', name: 'Luis' },
      { id: 'p4', name: 'Ana' },
    ],
  },
}

function renderCounter(context?: GameContext) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/partida',
          state: context ? { gameContext: context } : null,
        },
      ]}
    >
      <CounterScreen />
    </MemoryRouter>,
  )
}

function pressButton(label: string) {
  const button = screen.getByRole('button', { name: label })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
}

describe('CounterScreen', () => {
  it('suma un punto a Nosotros al tocar N', () => {
    renderCounter()
    expect(screen.getByTestId('score-nos')).toHaveTextContent('0')
    pressButton('N')
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
  })

  it('mantiene marcadores independientes por equipo', () => {
    renderCounter()
    pressButton('N')
    pressButton('E')
    pressButton('E')
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
    expect(screen.getByTestId('score-ellos')).toHaveTextContent('2')
  })

  it('deshace un punto del equipo', () => {
    renderCounter()
    pressButton('N')
    pressButton('N')
    pressButton('Deshacer Nosotros')
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
  })

  it('permite cambiar el objetivo antes de empezar', () => {
    renderCounter()
    fireEvent.click(screen.getByRole('button', { name: /subir objetivo/i }))
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('oculta el objetivo tras iniciar la partida', () => {
    renderCounter()
    expect(
      screen.getByRole('button', { name: /subir objetivo/i }),
    ).toBeInTheDocument()
    pressButton('N')
    expect(
      screen.queryByRole('button', { name: /subir objetivo/i }),
    ).not.toBeInTheDocument()
  })

  it('pide confirmar el ganador al alcanzar el objetivo', () => {
    renderCounter()
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    expect(screen.getByText(/el equipo ganador es/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sí$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^no$/i })).toBeInTheDocument()
  })

  it('no permite sumar al perdedor con el aviso de confirmación', () => {
    renderCounter()
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    pressButton('E')
    expect(screen.getByTestId('score-ellos')).toHaveTextContent('0')
  })

  it('el botón No mantiene el puntaje y quita el aviso', () => {
    renderCounter()
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }))
    expect(screen.getByTestId('score-nos')).toHaveTextContent('30')
    expect(screen.queryByText(/el equipo ganador es/i)).not.toBeInTheDocument()
  })

  it('confirmar inicia una partida nueva', () => {
    renderCounter()
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }))
    expect(screen.getByTestId('score-nos')).toHaveTextContent('0')
    expect(screen.getByTestId('score-ellos')).toHaveTextContent('0')
    expect(
      screen.getByRole('button', { name: /subir objetivo/i }),
    ).toBeInTheDocument()
  })
})

describe('CounterScreen - etiquetas de equipos', () => {
  it('usa Nosotros y Ellos en una partida rápida', () => {
    renderCounter()
    expect(
      screen.getByRole('heading', { name: 'Nosotros' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ellos' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Deshacer Nosotros' }),
    ).toBeInTheDocument()
  })

  it('usa Nosotros y Ellos también en una partida de grupo', () => {
    renderCounter(groupContext)
    expect(
      screen.getByRole('heading', { name: 'Nosotros' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ellos' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Deshacer Nosotros' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Deshacer Ellos' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Juan/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pedro/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Luis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument()
  })

  it('pregunta por Nosotros al confirmar el ganador', () => {
    renderCounter(groupContext)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    expect(
      screen.getByText(/el equipo ganador es “Nosotros”/i),
    ).toBeInTheDocument()
  })
})
