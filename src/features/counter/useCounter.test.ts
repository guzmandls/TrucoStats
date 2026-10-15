import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCounter } from './useCounter'

function addPoints(
  result: { current: ReturnType<typeof useCounter> },
  team: 'nos' | 'ellos',
  count: number,
) {
  act(() => {
    for (let i = 0; i < count; i += 1) {
      result.current.startIncrement(team)
    }
    result.current.finishIncrement()
  })
}

describe('useCounter', () => {
  it('arranca con objetivo por defecto y sin iniciar', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.target).toBe(30)
    expect(result.current.started).toBe(false)
    expect(result.current.finished).toBe(false)
  })

  it('ajusta el objetivo a múltiplos de 5 dentro de 10..100', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.setTarget(27))
    expect(result.current.target).toBe(25)
    act(() => result.current.setTarget(3))
    expect(result.current.target).toBe(10)
    act(() => result.current.setTarget(1000))
    expect(result.current.target).toBe(100)
  })

  it('no permite cambiar el objetivo una vez iniciada la partida', () => {
    const { result } = renderHook(() => useCounter())
    addPoints(result, 'nos', 1)
    act(() => result.current.setTarget(50))
    expect(result.current.target).toBe(30)
  })

  it('declara ganador al alcanzar el objetivo', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'ellos', 10)
    expect(result.current.hasReached('ellos')).toBe(true)
    expect(result.current.winner).toBe('ellos')
  })

  it('confirmar finaliza y bloquea más cambios', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 10)
    act(() => result.current.confirm())
    expect(result.current.finished).toBe(true)
    addPoints(result, 'ellos', 3)
    expect(result.current.points('ellos')).toBe(0)
  })

  it('no confirma si nadie alcanzó el objetivo', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 3)
    act(() => result.current.confirm())
    expect(result.current.finished).toBe(false)
  })

  it('reiniciar vuelve al estado inicial', () => {
    const { result } = renderHook(() => useCounter(10))
    addPoints(result, 'nos', 10)
    act(() => result.current.confirm())
    act(() => result.current.reset())
    expect(result.current.points('nos')).toBe(0)
    expect(result.current.started).toBe(false)
    expect(result.current.finished).toBe(false)
    expect(result.current.target).toBe(30)
  })
})
