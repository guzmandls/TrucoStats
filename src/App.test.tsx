import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra la pantalla principal', () => {
    render(<App />)
    expect(screen.getByText('TrucoStats')).toBeInTheDocument()
    expect(screen.getByText('Partida rápida')).toBeInTheDocument()
  })
})
