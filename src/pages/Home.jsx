import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import { formatKc, formatKcAbs } from '../lib/utils'

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [jackpot,    setJackpot]    = useState(null)
  const [upcomingM,  setUpcomingM]  = useState([])
  const [standings,  setStandings]  = useState([])
  const [myBets,     setMyBets]     = useState({})   // match_id → bet
  const [mySaldo,    setMySaldo]    = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetchJackpot(),
      fetchUpcoming(),
      fetchStandings(),
      fetchMyBets(),
    ]).finally(() => setLoading(false))
  }, [user])

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
  }

  async function fetchUpcoming() {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        domaci:tym_domaci ( id, nazev, vlajka_url ),
        hosti:tym_hosti   ( id, nazev, vlajka_url )
      `)
      .gte('vykop', new Date().toISOString())
      .eq('vyhodnoceno', false)
      .order('vykop')
      .limit(3)
    setUpcomingM(data ?? [])
  }

  async function fetchStandings() {
    const { data } = await supabase.rpc('get_player_standings')
    setStandings(data ?? [])
    // Najít vlastní saldo
    const mine = (data ?? []).find(r => r.id === user.id)
    setMySaldo(mine ?? null)
  }

  async function fetchMyBets() {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
    const map = {}
    ;(data ?? []).forEach(b => { map[b.match_id] = b })
    setMyBets(map)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    )
  }

  const top3 = standings.slice(0, 3)

  return (
    <div className="space-y-5">

      {/* Jackpot banner */}
      <div className="bg-gradient-to-br from-gold-500 to-yellow-400 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-900 text-xs font-semibold uppercase tracking-widest mb-1">💰 Jackpot</p>
            <p className="text-3xl font-black text-yellow-900">{formatKcAbs(jackpot)}</p>
            <p className="text-yellow-800 text-xs mt-1">Přechází na příští nevyhodnocený zápas</p>
          </div>
          <div className="text-5xl">🏆</div>
        </div>
      </div>

      {/* Moje saldo */}
      {mySaldo && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">📊 Moje statistiky</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className={`text-xl font-bold ${mySaldo.zisk > 0 ? 'text-pitch-600' : mySaldo.zisk < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                {formatKc(mySaldo.zisk)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Zisk / ztráta</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-700">{mySaldo.pocet_tipu}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tipů celkem</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-700">#{mySaldo.poradi}</div>
              <div className="text-xs text-gray-500 mt-0.5">Pořadí</div>
            </div>
          </div>
        </div>
      )}

      {/* Nejbližší zápasy */}
      {upcomingM.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Nadcházející zápasy</h2>
          <div className="space-y-3">
            {upcomingM.map(m => (
              <MatchCard key={m.id} match={m} myBet={myBets[m.id]} />
            ))}
          </div>
          <button
            className="mt-3 w-full text-pitch-600 font-semibold text-sm py-2 hover:underline"
            onClick={() => navigate('/zapasy')}
          >
            Zobrazit všechny zápasy →
          </button>
        </div>
      )}

      {/* Žebříček – top 3 */}
      {top3.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">🏆 Žebříček</h2>
            <button
              className="text-pitch-600 font-semibold text-xs hover:underline"
              onClick={() => navigate('/zebricek')}
            >
              Vše →
            </button>
          </div>
          <div className="space-y-2">
            {top3.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  p.id === user.id ? 'bg-pitch-50 border border-pitch-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="font-semibold text-sm text-gray-800">
                    {p.prezdivka}
                    {p.id === user.id && <span className="text-pitch-600 text-xs ml-1">(já)</span>}
                  </span>
                </div>
                <span className={`text-sm font-bold ${p.zisk > 0 ? 'text-pitch-600' : p.zisk < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {formatKc(p.zisk)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
