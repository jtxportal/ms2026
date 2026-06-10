import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AFK_LOGO, TROPHY } from '../lib/images'

const NAV = [
  { to: '/dlouhodoby', label: 'Tipy',     icon: '🎯' },
  { to: '/',           label: 'Domů',     icon: '🏠', end: true },
  { to: '/zapasy',     label: 'Zápasy',   icon: '⚽' },
  { to: '/zebricek',   label: 'Žebříček', icon: '🏆' },
  { to: '/chat',       label: 'Chat',     icon: '💬' },
  { to: '/profil',     label: 'Profil',   icon: '👤' },
]

export default function Layout({ children }) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/prihlasit')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#04091c' }}>

      {/* Rainbow stripe nahoře */}
      <div className="rainbow-stripe" />

      {/* Header */}
      <header style={{
        background: 'rgba(4,9,28,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '10px 16px' }}>

          {/* Logo + user */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={AFK_LOGO} alt="AFK" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(0,180,200,0.6)" }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: '16px',
                letterSpacing: '1px', textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #fff, #e8a020)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Tipovačka MS 2026
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isAdmin && (
                <NavLink to="/admin" style={({ isActive }) => ({
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                  borderRadius: '20px', textDecoration: 'none',
                  background: isActive ? '#e8a020' : 'rgba(232,160,32,0.15)',
                  color: isActive ? '#000' : '#e8a020',
                  border: '1px solid rgba(232,160,32,0.4)',
                })}>
                  Admin
                </NavLink>
              )}
              <span style={{ fontSize: '13px', color: '#00b4c8', fontWeight: 600 }}>
                {profile?.prezdivka ?? '…'}
              </span>
              <button onClick={handleSignOut} style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
                Odhlásit
              </button>
            </div>
          </div>

          {/* Navigace */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {NAV.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => ({
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '6px 2px',
                  textDecoration: 'none',
                  fontSize: '10px', fontWeight: 600,
                  borderRadius: '10px',
                  color: isActive ? '#e8a020' : 'rgba(255,255,255,0.45)',
                  background: isActive ? 'rgba(232,160,32,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(232,160,32,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s',
                })}
              >
                <span style={{ fontSize: '17px', lineHeight: 1, marginBottom: '2px' }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      {/* Obsah */}
      <main style={{ flex: 1, padding: '20px 16px 40px', maxWidth: '28rem', margin: '0 auto', width: '100%' }}>
        {children}
      </main>

    </div>
  )
}
