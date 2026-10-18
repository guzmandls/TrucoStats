import { HomeScreen } from './features/groups/HomeScreen'
import { CounterScreen } from './features/counter/CounterScreen'
import { CreateGroupScreen } from './features/groups/CreateGroupScreen'
import { GroupScreen } from './features/groups/GroupScreen'
import { StartGroupGameScreen } from './features/groups/StartGroupGameScreen'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="/partida-grupo/:id" element={<StartGroupGameScreen />} />
        <Route path="/crear-grupo" element={<CreateGroupScreen />} />
        <Route path="/grupo/:id" element={<GroupScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
