import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import { formatKc, formatKcAbs } from '../lib/utils'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [jackpot,   setJackpot]   = useState(null)
  const [upcoming,  setUpcoming]  = useState([])
  const [standings, setStandings] = useState([])
  const [myBets,    setMyBets]    = useState({})
  const [myStats,   setMyStats]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetchJackpot(), fetchUpcoming(), fetchStandings(),
      fetchMyBets(), fetchMyStats()
    ]).finally(() => setLoading(false))
  }, [user])

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
  }
  async function fetchUpcoming() {
    const { data } = await supabase
      .from('matches')
      .select('*, domaci:tym_domaci(id,nazev,vlajka_url), hosti:tym_hosti(id,nazev,vlajka_url)')
      .gte('vykop', new Date().toISOString())
      .eq('vyhodnoceno', false)
      .order('vykop').limit(3)
    setUpcoming(data ?? [])
  }
  async function fetchStandings() {
    const { data } = await supabase.rpc('get_player_standings')
    setStandings(data ?? [])
  }
  async function fetchMyBets() {
    const { data } = await supabase.from('bets').select('*').eq('user_id', user.id)
    const map = {}
    ;(data ?? []).forEach(b => { map[b.match_id] = b })
    setMyBets(map)
  }
  async function fetchMyStats() {
    const { data } = await supabase.rpc('get_my_stats', { p_user_id: user.id })
    setMyStats(data?.[0] ?? null)
  }

  if (loading) return <div className="flex justify-center h-48 items-center"><div className="text-4xl animate-bounce">⚽</div></div>

  const top3   = standings.slice(0, 3)
  const myRank = standings.find(r => r.id === user.id)

  return (
    <div className="space-y-5">

      {/* Jackpot */}
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

      {/* Pravidla – rozklikávací */}
      <div className="card">
        <button
          onClick={() => setShowRules(r => !r)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="font-bold text-gray-900">Pravidla soutěže</span>
          </div>
          <span className="text-gray-400">{showRules ? '▲' : '▼'}</span>
        </button>

        {showRules && (
          <div className="mt-4 border-t border-gray-100 pt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-base text-gray-900">Ahoj kamarádi!</p>
            <p>Připravili jsme jednoduchou aplikaci na tipování výsledků Mistrovství světa ve fotbale. Nejde o žádnou sázkovou kancelář — veškeré vložené peníze se rozdělí mezi účastníky podle jejich úspěšnosti při tipování.</p>
            <div className="bg-blue-50 rounded-xl p-3 space-y-1">
              <p className="font-bold text-gray-800">Jak to funguje</p>
              <p>Tipuje se <strong>přesný výsledek po základní hrací době</strong>. Prodloužení ani penalty se nezapočítávají.</p>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-1">Výše sázek</p>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100"><span>Skupiny</span><strong>10 Kč</strong></div>
                <div className="flex justify-between py-1 border-b border-gray-100"><span>1/32, 1/16, osmifinále, čtvrtfinále</span><strong>20 Kč</strong></div>
                <div className="flex justify-between py-1 border-b border-gray-100"><span>Semifinále</span><strong>50 Kč</strong></div>
                <div className="flex justify-between py-1 border-b border-gray-100"><span>Finále</span><strong>100 Kč</strong></div>
                <div className="flex justify-between py-1"><span>Vítěz MS + nejlepší střelec</span><strong>20 Kč</strong></div>
              </div>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-1">Bank zápasu</p>
              <p>Všechny sázky na zápas tvoří společný bank. Rozdělí se rovným dílem mezi výherce. Nikdo netrefí → bank přechází do jackpotu.</p>
              <p className="text-xs text-gray-500 mt-1">Příklad: 30 hráčů × 10 Kč = bank 300 Kč. Trefí 3 hráči → každý dostane 100 Kč.</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="font-bold text-gray-800 mb-1">⚠️ Změna tipu</p>
              <p>Každý účastník může svůj tip <strong>jednou změnit</strong> před výkopem. Po zahájení zápasu je tip automaticky uzamčen.</p>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-1">Jackpot po finále</p>
              <p>Případný nerozdělený jackpot se rozdělí: <strong>1. místo 50 %</strong> · <strong>2. místo 33 %</strong> · <strong>3. místo 17 %</strong></p>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-1">Chat</p>
              <p>Turnajový chat + chat ke každému zápasu. Slušné a sportovní chování prosím. Administrátor <strong>Venca Šindílek a Bob</strong> mají právo hráče při opakovaném porušování zabanovat.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p>Registrací potvrzuješ, že po skončení MS uhradíš případný záporný zůstatek. Organizátoři si z vložených prostředků neodečítají žádnou provizi.</p>
            </div>
            <p className="text-center font-semibold text-gray-700 pt-1">⚽ Sportu zdar, fotbalu zvlášť a kácovskému obzvlášť!</p>
          </div>
        )}
      </div>

      {/* Moje statistiky */}
      {myStats && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            📊 Moje statistiky {myRank ? `· #${myRank.poradi} v žebříčku` : ''}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className={`text-xl font-bold ${Number(myStats.zisk)>0?'text-pitch-600':Number(myStats.zisk)<0?'text-red-500':'text-gray-700'}`}>
                {formatKc(myStats.zisk)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Zisk / ztráta</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-bold text-gray-700">{myStats.pocet_tipu_celkem}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tipů celkem</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-bold text-pitch-600">{myStats.uspesnost_pct}%</div>
              <div className="text-xs text-gray-500 mt-0.5">Úspěšnost</div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Tipů celkem: {myStats.pocet_tipu_celkem}</span>
              <span>Vsazeno: {formatKcAbs(myStats.vsazeno_celkem)}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>✅ Vyhodnoceno: {myStats.pocet_vyhodnocenych}</span>
              <span>Vyhráno: {formatKcAbs(myStats.vyhrano_celkem)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>⏳ Čeká na výsledek: {myStats.pocet_nevyhodnocenych}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nejbližší zápasy */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Nadcházející zápasy</h2>
          <div className="space-y-3">
            {upcoming.map(m => <MatchCard key={m.id} match={m} myBet={myBets[m.id]} />)}
          </div>
          <button className="mt-3 w-full text-pitch-600 font-semibold text-sm py-2 hover:underline" onClick={() => navigate('/zapasy')}>
            Zobrazit všechny zápasy →
          </button>
        </div>
      )}

      {/* Žebříček top 3 */}
      {top3.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">🏆 Žebříček</h2>
            <button className="text-pitch-600 font-semibold text-xs hover:underline" onClick={() => navigate('/zebricek')}>Vše →</button>
          </div>
          <div className="space-y-2">
            {top3.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${p.id===user.id?'bg-pitch-50 border border-pitch-200':'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{i===0?'🥇':i===1?'🥈':'🥉'}</span>
                  <span className="font-semibold text-sm text-gray-800">{p.prezdivka}{p.id===user.id&&<span className="text-pitch-600 text-xs ml-1">(já)</span>}</span>
                </div>
                <span className={`text-sm font-bold ${Number(p.zisk)>0?'text-pitch-600':Number(p.zisk)<0?'text-red-500':'text-gray-500'}`}>
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
