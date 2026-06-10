import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatKc, formatKcAbs } from '../lib/utils'

export default function Leaderboard() {
  const { user } = useAuth()
  const [standings, setStandings] = useState([])
  const [jackpot,   setJackpot]   = useState(0)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchStandings(), fetchJackpot()])
      .finally(() => setLoading(false))
  }, [])

  async function fetchStandings() {
    const { data } = await supabase.rpc('get_player_standings')
    setStandings(data ?? [])
  }

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl text-gray-900">Žebříček</h1>

      {/* Jackpot */}
      <div className="bg-gradient-to-r from-gold-500 to-yellow-400 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-yellow-900 text-xs font-semibold">💰 Aktuální jackpot</p>
          <p className="text-2xl font-black text-yellow-900">{formatKcAbs(jackpot)}</p>
        </div>
        <div className="text-3xl">🏆</div>
      </div>

      {/* Tabulka */}
      {standings.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">📊</p>
          <p>Zatím žádné výsledky</p>
          <p className="text-sm mt-1">Žebříček se aktualizuje po vyhodnocení prvního zápasu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {standings.map((p) => {
            const isMe = p.id === user.id
            const pPos = Number(p.poradi)
            const medal = pPos <= 3 ? medals[pPos - 1] : null

            return (
              <div
                key={p.id}
                className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
                  isMe
                    ? 'bg-pitch-50 border-2 border-pitch-300 shadow-sm'
                    : 'bg-white border border-gray-100 shadow-sm'
                }`}
              >
                {/* Pořadí */}
                <div className="w-8 text-center flex-shrink-0">
                  {medal
                    ? <span className="text-xl">{medal}</span>
                    : <span className="text-sm font-bold text-gray-400">#{pPos}</span>
                  }
                </div>

                {/* Jméno */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {p.prezdivka}
                    {isMe && <span className="text-pitch-600 text-xs ml-1">(já)</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.pocet_tipu} tipů · vsazeno {formatKcAbs(p.vsazeno_celkem)} · vyhráno {formatKcAbs(p.vyhrano_celkem)}
                  </p>
                </div>

                {/* Zisk */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-base font-bold ${
                    Number(p.zisk) > 0 ? 'text-pitch-600'
                    : Number(p.zisk) < 0 ? 'text-red-500'
                    : 'text-gray-400'
                  }`}>
                    {formatKc(p.zisk)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-center text-gray-400 pb-2">
        Zisk = vyhráno − vsazeno · aktualizuje se po každém vyhodnoceném zápase
      </p>
    </div>
  )
}
