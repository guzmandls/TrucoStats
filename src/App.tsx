import { AuthScreen } from './features/auth/AuthScreen'
import { ConfirmEmailScreen } from './features/auth/ConfirmEmailScreen'
import { ForgotPasswordScreen } from './features/auth/ForgotPasswordScreen'
import { ResetPasswordScreen } from './features/auth/ResetPasswordScreen'
import { HomeScreen } from './features/groups/HomeScreen'
import { CounterScreen } from './features/counter/CounterScreen'
import { CreateGroupScreen } from './features/groups/CreateGroupScreen'
import { GroupScreen } from './features/groups/GroupScreen'
import { JoinGroupScreen } from './features/groups/JoinGroupScreen'
import { LiveMatchScreen } from './features/groups/LiveMatchScreen'
import { GroupStatsScreen } from './features/groups/GroupStatsScreen'
import { MemberScreen } from './features/groups/MemberScreen'
import { ParticipantsScreen } from './features/groups/ParticipantsScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'
import { StartGroupGameScreen } from './features/groups/StartGroupGameScreen'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { InstallScreen } from './features/install/InstallScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/partida" element={<CounterScreen />} />
        <Route path="/partida-grupo/:id" element={<StartGroupGameScreen />} />
        <Route path="/crear-grupo" element={<CreateGroupScreen />} />
        <Route path="/registrarse" element={<AuthScreen mode="register" />} />
        <Route path="/iniciar-sesion" element={<AuthScreen mode="login" />} />
        <Route path="/recuperar" element={<ForgotPasswordScreen />} />
        <Route path="/restablecer/:token" element={<ResetPasswordScreen />} />
        <Route
          path="/confirmar-correo/:token"
          element={<ConfirmEmailScreen />}
        />
        <Route path="/unirse/:code" element={<JoinGroupScreen />} />
        <Route path="/grupo/:id" element={<GroupScreen />} />
        <Route
          path="/grupo/:id/en-vivo/:liveId"
          element={<LiveMatchScreen />}
        />
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
        <Route path="/instalar" element={<InstallScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
