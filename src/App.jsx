import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Home           from './pages/Home'
import Calendar       from './pages/Calendar'
import BetForm        from './pages/BetForm'
import MatchDetail    from './pages/MatchDetail'
import Leaderboard    from './pages/Leaderboard'
import LongtermBets   from './pages/LongtermBets'
import TournamentChat from './pages/TournamentChat'
import AdminPage      from './pages/Admin'

function AppShell({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/prihlasit"  element={<Login />} />
          <Route path="/registrace" element={<Register />} />
          <Route path="/" element={<AppShell><Home /></AppShell>} />
          <Route path="/zapasy" element={<AppShell><Calendar /></AppShell>} />
          <Route path="/zapas/:id" element={<AppShell><MatchDetail /></AppShell>} />
          <Route path="/tip/:id" element={<AppShell><BetForm /></AppShell>} />
          <Route path="/zebricek" element={<AppShell><Leaderboard /></AppShell>} />
          <Route path="/chat" element={<AppShell><TournamentChat /></AppShell>} />
          <Route path="/dlouhodoby" element={<AppShell><LongtermBets /></AppShell>} />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}