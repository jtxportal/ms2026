import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/',         label: 'Domů',     icon: '🏠' },
  { to: '/zapasy',   label: 'Zápasy',   icon: '⚽' },
  { to: '/zebricek', label: 'Žebříček', icon: '🏆' },
  { to: '/chat',     label: 'Chat',     icon: '💬' },
  { to: '/dlouhodoby', label: 'Tipy',   icon: '🎯' },
]

export default function Layout({ children }) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/prihlasit')
  }

  return (
    <div className="min-h-screen flex flex-col pb-20">

      {/* Horní pruh */}
      <header className="bg-pitch-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-sm tracking-wide">Tipovačka MS 2026</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'bg-white text-pitch-800' : 'text-pitch-100 hover:bg-pitch-700'
                }`
              }
            >
              Admin
            </NavLink>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-pitch-100">
              {profile?.prezdivka ?? '…'}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-pitch-300 hover:text-white transition-colors"
            >
              Odhlásit
            </button>
          </div>
        </div>
      </header>

      {/* Obsah */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Dolní navigace */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex max-w-lg mx-auto">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-pitch-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <span className="text-lg leading-none mb-0.5">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  )
}
