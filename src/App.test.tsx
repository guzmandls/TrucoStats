import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el título de TrucoStats', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /trucostats/i }),
    ).toBeInTheDocument()
  })
})
