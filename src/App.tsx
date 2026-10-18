import { HomeScreen } from './features/groups/HomeScreen'
import { CounterScreen } from './features/counter/CounterScreen'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
