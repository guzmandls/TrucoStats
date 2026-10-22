import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreMarks } from './ScoreMarks'

// Los trazos del cuadrado, en el orden en que se dibujan.
function paths(container: HTMLElement): SVGPathElement[] {
  return [...container.querySelectorAll('path')]
}

function animated(container: HTMLElement): number[] {
  return paths(container)
    .map((path, index) =>
      path.getAttribute('class')?.includes('drawing') ? index : -1,
    )
    .filter((index) => index >= 0)
}

describe('ScoreMarks', () => {
  it('dibuja un cuadrado de cinco trazos por cada cinco puntos', () => {
    const { container } = render(<ScoreMarks points={7} spacerIndex={null} />)

    const squares = container.querySelectorAll('svg')
    expect(squares).toHaveLength(2)
    expect(paths(container)).toHaveLength(10)
  })

  it('no anima nada al abrir una partida que ya tenía puntos', () => {
    const { container } = render(<ScoreMarks points={13} spacerIndex={null} />)

    expect(animated(container)).toEqual([])
  })

  it('anima solo el trazo que se acaba de sumar', () => {
    const { container, rerender } = render(
      <ScoreMarks points={2} spacerIndex={null} />,
    )

    rerender(<ScoreMarks points={3} spacerIndex={null} />)

    // El tercer trazo del primer cuadrado.
    expect(animated(container)).toEqual([2])
  })

  it('anima el primer trazo de un cuadrado nuevo y la diagonal que lo completa', () => {
    const { container, rerender } = render(
      <ScoreMarks points={4} spacerIndex={null} />,
    )

    rerender(<ScoreMarks points={5} spacerIndex={null} />)
    expect(animated(container)).toEqual([4])

    rerender(<ScoreMarks points={6} spacerIndex={null} />)
    // Primer trazo del segundo cuadrado (índice 5 de los dibujados).
    expect(animated(container)).toEqual([5])
  })

  it('no anima al deshacer ni cuando los puntos saltan de golpe', () => {
    const { container, rerender } = render(
      <ScoreMarks points={6} spacerIndex={null} />,
    )

    rerender(<ScoreMarks points={5} spacerIndex={null} />)
    expect(animated(container)).toEqual([])

    rerender(<ScoreMarks points={9} spacerIndex={null} />)
    expect(animated(container)).toEqual([])
  })
})
