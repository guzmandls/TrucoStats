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

  it('oculta el objetivo tras iniciar la partida', () => {
    render(<CounterScreen />)
    expect(
      screen.getByRole('button', { name: /subir objetivo/i }),
    ).toBeInTheDocument()
    pressButton('N')
    expect(
      screen.queryByRole('button', { name: /subir objetivo/i }),
    ).not.toBeInTheDocument()
  })

  it('pide confirmar el ganador al alcanzar el objetivo', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    expect(screen.getByText(/el equipo ganador es/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sí$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^no$/i })).toBeInTheDocument()
  })

  it('no permite sumar al perdedor con el aviso de confirmación', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    pressButton('E')
    expect(screen.getByTestId('score-ellos')).toHaveTextContent('0')
  })

  it('el botón No deshace el último punto y quita el aviso', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }))
    expect(screen.getByTestId('score-nos')).toHaveTextContent('29')
    expect(screen.queryByText(/el equipo ganador es/i)).not.toBeInTheDocument()
  })

  it('finaliza la partida y muestra al ganador', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /^sí$/i }))
    expect(
      screen.getByRole('heading', { name: /ganó nosotros/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nueva partida/i }),
    ).toBeInTheDocument()
  })
})
