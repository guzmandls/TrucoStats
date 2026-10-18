import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CounterScreen } from './features/counter/CounterScreen'

function Home() {
  return <CounterScreen />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
