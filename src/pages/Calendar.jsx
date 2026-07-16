import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import MatchChat    from '../components/MatchChat'
import BetsReveal   from '../components/BetsReveal'
import { toCEST } from '../lib/utils'

export default function Calendar() {
  const { user } = useAuth()
  const [matches, setMatches]     = useState([])
  const [myBets,  setMyBets]      = useState({})
  const [tab,     setTab]         = useState('o_3_misto')
  const [loading, setLoading]     = useState(true)
  const todayRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchMatches(), fetchMyBets()])
      .finally(() => setLoading(false))
  }, [user])

  // Během živých zápasů obnovuj skóre/minutu/průběh každou minutu.
  const anyLive = matches.some(m => ['1H','HT','2H','ET','BT','P','LIVE'].includes(m.live_status))
  useEffect(() => {
    if (!anyLive) return
    const t = setInterval(fetchMatches, 60000)
    return () => clearInterval(t)
  }, [anyLive])

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        domaci:tym_domaci ( id, nazev, vlajka_url ),
        hosti:tym_hosti   ( id, nazev, vlajka_url )
      `)
      .order('vykop')
    setMatches(data ?? [])
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

  function nowCEST() {
    return toCEST(new Date().toISOString())
  }

  function matchDay(m) {
    return toCEST(m.vykop).toISOString().slice(0, 10)
  }

  function todayCEST() {
    return nowCEST().toISOString().slice(0, 10)
  }

  function tomorrowCEST() {
    const t = new Date(nowCEST().getTime() + 86400000)
    return t.toISOString().slice(0, 10)
  }

  function yesterdayCEST() {
    const t = new Date(nowCEST().getTime() - 86400000)
    return t.toISOString().slice(0, 10)
  }

  function filtered() {
    switch (tab) {
      case 'vcera':
        return matches.filter(m => matchDay(m) === yesterdayCEST())
      // Závěr turnaje: místo Dnes/Zítra filtrujeme rovnou podle fáze
      case 'o_3_misto':
        return matches.filter(m => m.faze === 'o_3_misto')
      case 'finale':
        return matches.filter(m => m.faze === 'finale')
      case 'historie':
        return matches.filter(m => matchDay(m) < todayCEST())
      default:
        return matches
    }
  }

  const visible = filtered()

  // Skupinovat podle data
  function groupByDate(list) {
    const groups = {}
    list.forEach(m => {
      const d = matchDay(m)
      if (!groups[d]) groups[d] = []
      groups[d].push(m)
    })
    return groups
  }

  const grouped = groupByDate(visible)

  return (
    <div>
      {/* Rychlý filtr – přepínač */}
      <div className="mb-4 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-1">
          {[
            { id: 'vcera', label: 'Včera' },
            { id: 'o_3_misto', label: '🥉 O 3. místo' },
            { id: 'finale', label: '🏆 Finále' },
            { id: 'all', label: 'Vše' },
            { id: 'historie', label: 'Historie' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-pitch-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-4xl animate-bounce">⚽</div>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <div className="text-4xl mb-3">📅</div>
          <p>Žádné zápasy pro tento filtr</p>
        </div>
      ) : (
        <div className="space-y-6">


          {Object.entries(grouped).map(([date, dayMatches]) => {
            const d = new Date(date + 'T12:00:00Z')
            const isToday = new Date().toDateString() === d.toDateString()
            const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
            const months = ['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro']
            const label = `${days[d.getUTCDay()]} ${d.getUTCDate()}. ${months[d.getUTCMonth()]}`

            return (
              <div ref={isToday ? todayRef : null} key={date}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {label}
                </h3>
                <div className="space-y-3">
                  {dayMatches.map(m => (
                    <div key={m.id}>
                      <MatchCard match={m} myBet={myBets[m.id]} />
                      <BetsReveal
                        matchId={m.id}
                        vykop={m.vykop}
                        vyhodnoceno={m.vyhodnoceno}
                        skore_domaci={m.vysledek_domaci}
                        skore_hosti={m.vysledek_hosti}
                      />
                      <MatchChat
                        matchId={m.id}
                        vykop={m.vykop}
                        nazevD={m.domaci?.nazev}
                        nazevH={m.hosti?.nazev}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
