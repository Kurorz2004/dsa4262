import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Survey from './pages/Survey'
import Journal from './pages/Journal'
import History from './pages/History'
import Streak from './pages/Streak'

function RequireProfile({ children }: { children: React.ReactNode }) {
  const userId = localStorage.getItem('userId')
  if (!userId) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<RequireProfile><Layout /></RequireProfile>}>
          <Route index element={<Home />} />
          <Route path="survey" element={<Survey />} />
          <Route path="journal" element={<Journal />} />
          <Route path="history" element={<History />} />
          <Route path="streak" element={<Streak />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
