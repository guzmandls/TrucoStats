import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CounterScreen } from './CounterScreen'

function pressButton(label: string) {
  const button = screen.getByRole('button', { name: label })
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
}

describe('CounterScreen', () => {
  it('suma un punto a Nosotros al tocar N', () => {
    render(<CounterScreen />)
    expect(screen.getByTestId('score-nos')).toHaveTextContent('0')
    pressButton('N')
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
  })

  it('mantiene marcadores independientes por equipo', () => {
    render(<CounterScreen />)
    pressButton('N')
    pressButton('E')
    pressButton('E')
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
    expect(screen.getByTestId('score-ellos')).toHaveTextContent('2')
  })

  it('deshace la última acción del equipo', () => {
    render(<CounterScreen />)
    pressButton('N')
    pressButton('N')
    fireEvent.click(screen.getByRole('button', { name: /deshacer nosotros/i }))
    expect(screen.getByTestId('score-nos')).toHaveTextContent('1')
  })

  it('permite cambiar el objetivo antes de empezar', () => {
    render(<CounterScreen />)
    fireEvent.click(screen.getByRole('button', { name: /subir objetivo/i }))
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('bloquea el cambio de objetivo tras iniciar la partida', () => {
    render(<CounterScreen />)
    pressButton('N')
    expect(
      screen.getByRole('button', { name: /subir objetivo/i }),
    ).toBeDisabled()
  })

  it('muestra la opción de confirmar al alcanzar el objetivo', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    expect(
      screen.getByRole('button', { name: /confirmar final/i }),
    ).toBeInTheDocument()
  })

  it('finaliza la partida y muestra al ganador', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /confirmar final/i }))
    expect(
      screen.getByRole('heading', { name: /ganó nosotros/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nueva partida/i }),
    ).toBeInTheDocument()
  })
})
