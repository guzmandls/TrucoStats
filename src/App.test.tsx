import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el contador con ambos equipos', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /nosotros/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ellos/i })).toBeInTheDocument()
  })
})
