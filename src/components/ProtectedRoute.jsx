import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pitch-800">
        <div className="text-white text-center">
          <div className="text-4xl mb-3 animate-bounce">⚽</div>
          <p className="text-pitch-200 text-sm">Načítám…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/prihlasit" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  return children
}
