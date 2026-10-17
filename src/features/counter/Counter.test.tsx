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

  it('deshace un punto del equipo', () => {
    render(<CounterScreen />)
    pressButton('N')
    pressButton('N')
    pressButton('Deshacer Nosotros')
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

  it('el botón No mantiene el puntaje y quita el aviso', () => {
    render(<CounterScreen />)
    for (let i = 0; i < 30; i += 1) {
      pressButton('N')
    }
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }))
    expect(screen.getByTestId('score-nos')).toHaveTextContent('30')
    expect(screen.queryByText(/el equipo ganador es/i)).not.toBeInTheDocument()
  })

  it('confirmar inicia una partida nueva', () => {
    render(<CounterScreen />)
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

  it('abre y cierra el historial', () => {
    render(<CounterScreen />)
    fireEvent.click(screen.getByRole('button', { name: /historial/i }))
    expect(
      screen.getByRole('dialog', { name: /historial/i }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /volver/i }))
    expect(
      screen.queryByRole('dialog', { name: /historial/i }),
    ).not.toBeInTheDocument()
  })
})
