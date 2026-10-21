import { HomeScreen } from './features/groups/HomeScreen'
import { CounterScreen } from './features/counter/CounterScreen'
import { CreateGroupScreen } from './features/groups/CreateGroupScreen'
import { GroupScreen } from './features/groups/GroupScreen'
import { JoinGroupScreen } from './features/groups/JoinGroupScreen'
import { GroupStatsScreen } from './features/groups/GroupStatsScreen'
import { MemberScreen } from './features/groups/MemberScreen'
import { ParticipantsScreen } from './features/groups/ParticipantsScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'
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
        <Route path="/unirse/:code" element={<JoinGroupScreen />} />
        <Route path="/grupo/:id" element={<GroupScreen />} />
        <Route path="/grupo/:id/estadisticas" element={<GroupStatsScreen />} />
        <Route
          path="/grupo/:id/participantes"
          element={<ParticipantsScreen />}
        />
        <Route
          path="/grupo/:id/participantes/:memberId"
          element={<MemberScreen />}
        />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
