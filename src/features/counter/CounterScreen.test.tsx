import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CounterScreen } from './CounterScreen'

function HomeProbe() {
  const location = useLocation()
  return <div data-testid="path">{location.pathname}</div>
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/partida']}>
      <Routes>
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="/" element={<HomeProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CounterScreen', () => {
  it('muestra el botón de volver en la barra superior', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('retrocede al inicio con el botón de volver', () => {
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/')
  })
})
