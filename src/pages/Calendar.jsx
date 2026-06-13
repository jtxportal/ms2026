import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import MatchChat    from '../components/MatchChat'
import BetsReveal   from '../components/BetsReveal'
import { toCEST, SKUPINY } from '../lib/utils'

const TABS = [
  { id: 'all',   label: 'Vše' },
  { id: 'dnes',  label: 'Dnes' },
  { id: 'jutri', label: 'Zítra' },
  { id: 'A', label: 'A' },
  { id: 'B', label: 'B' },
  { id: 'C', label: 'C' },
  { id: 'D', label: 'D' },
]

export default function Calendar() {
  const { user } = useAuth()
  const [matches, setMatches]     = useState([])
  const [myBets,  setMyBets]      = useState({})
  const [tab,     setTab]         = useState('dnes')
  const [loading, setLoading]     = useState(true)
  const [skupinaFilter, setSkupinaFilter] = useState(null)
  const todayRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchMatches(), fetchMyBets()])
      .finally(() => setLoading(false))
  }, [user])

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

  function filtered() {
    if (skupinaFilter) {
      return matches.filter(m => m.skupina === skupinaFilter)
    }
    switch (tab) {
      case 'dnes':
        return matches.filter(m => matchDay(m) === todayCEST())
      case 'jutri':
        return matches.filter(m => matchDay(m) === tomorrowCEST())
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

  const SKUPINY_TABS = ['A','B','C','D','E','F','G','H','I','J','K','L']

  return (
    <div>
      {/* Rychlý filtr – přepínač */}
      <div className="mb-4 overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-1">
          {[
            { id: 'dnes', label: 'Dnes' },
            { id: 'jutri', label: 'Zítra' },
            { id: 'all', label: 'Vše' },
            { id: 'historie', label: 'Historie' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSkupinaFilter(null) }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id && !skupinaFilter
                  ? 'bg-pitch-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="w-px bg-gray-200 self-stretch mx-1" />
          {SKUPINY_TABS.map(s => (
            <button
              key={s}
              onClick={() => { setSkupinaFilter(s); setTab('') }}
              className={`flex-shrink-0 w-9 h-8 rounded-full text-xs font-bold transition-colors ${
                skupinaFilter === s
                  ? 'bg-pitch-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {s}
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
