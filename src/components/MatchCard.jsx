import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatTime, isBeforeKickoff, minutesUntilKickoff,
         FAZE_LABEL, FAZE_COLOR, FAZE_CENA } from '../lib/utils'
import MatchEvents from './MatchEvents'

export default function MatchCard({ match, myBet, compact = false }) {
  const navigate = useNavigate()
  const locked = !isBeforeKickoff(match.vykop)
  const mins   = minutesUntilKickoff(match.vykop)

  const domaci = match.domaci ?? match.tym_domaci
  const hosti  = match.hosti  ?? match.tym_hosti

  const nazevD = typeof domaci === 'object' ? domaci?.nazev : domaci ?? '?'
  const nazevH = typeof hosti  === 'object' ? hosti?.nazev  : hosti  ?? '?'
  const flagD  = typeof domaci === 'object' ? domaci?.vlajka_url : null
  const flagH  = typeof hosti  === 'object' ? hosti?.vlajka_url  : null

  const hasBet    = myBet != null
  const isLive    = ['1H','HT','2H','ET','BT','P','LIVE'].includes(match.live_status)
  const isEnded   = ['FT','AET','PEN','finished'].includes(match.live_status)
  const isSettled = match.vyhodnoceno === true
  // Oficiální výsledek až po vyhodnocení; jinak živé skóre; u nezačatých nic.
  const scoreD    = isSettled ? match.vysledek_domaci : (isLive || isEnded ? match.live_home : null)
  const scoreH    = isSettled ? match.vysledek_hosti  : (isLive || isEnded ? match.live_away : null)
  const hasResult = scoreD != null

  // Žluté skóre + živá minuta u probíhajícího zápasu; bílé u dohraného.
  const scoreColor = (isLive && !isSettled) ? '#facc15' : '#fff'
  const [showEvents, setShowEvents] = useState(false)

  function handleTip() {
    if (!locked) navigate(`/tip/${match.id}`)
  }

  return (
    <div
      className={`card ${!locked && !compact ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={!locked && !compact ? handleTip : undefined}
    >
      {/* Fáze + čas */}
      <div className="flex items-center justify-between mb-3">
        <span className={`badge ${FAZE_COLOR[match.faze] ?? 'bg-gray-100 text-gray-600'}`}>
          {match.faze === 'skupina' && match.skupina
            ? `Skupina ${match.skupina}`
            : FAZE_LABEL[match.faze] ?? match.faze}
        </span>
        <div className="text-right">
          {isLive ? (
            <span style={{ color: '#facc15', fontWeight: 700, fontSize: '12px' }}>
              🔴 {match.live_status === 'HT' ? 'Poločas' : `${match.live_minute ?? ''}'`}
            </span>
          ) : (
            <>
              <span className="text-xs text-gray-500">{formatDate(match.vykop)}</span>
              <span className="text-xs text-gray-700 font-semibold ml-2">{formatTime(match.vykop)}</span>
              {!locked && mins < 60 && mins > 0 && (
                <span className="ml-1 text-xs text-red-500 font-medium">({mins} min)</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Týmy */}
      <div className="flex items-center justify-center gap-4">
        {/* Domácí */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {flagD && (
            <img src={flagD} alt={nazevD} className="w-9 h-6 object-cover rounded shadow-sm" />
          )}
          <span className="text-sm font-semibold text-center leading-tight">{nazevD}</span>
        </div>

        {/* Výsledek nebo skóre */}
        <div className="flex flex-col items-center min-w-[60px]">
          {hasResult ? (
            <div style={{ fontSize: "22px", fontWeight: 800, color: scoreColor }}>
              {scoreD} : {scoreH}
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-300">– : –</div>
          )}
          {!locked && !hasResult && (
            <div className="text-[10px] text-pitch-600 font-medium mt-0.5">
              {FAZE_CENA[match.faze]} Kč
            </div>
          )}
          {locked && !hasResult && (
            <div className="text-[10px] text-gray-400 mt-0.5">🔒 zamčeno</div>
          )}
        </div>

        {/* Hosté */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {flagH && (
            <img src={flagH} alt={nazevH} className="w-9 h-6 object-cover rounded shadow-sm" />
          )}
          <span className="text-sm font-semibold text-center leading-tight">{nazevH}</span>
        </div>
      </div>

      {/* Uživatelův tip */}
      {hasBet && (
        <div className={`mt-3 rounded-xl px-3 py-1.5 text-center text-sm
          ${isSettled
            ? (myBet.tip_domaci === match.vysledek_domaci &&
               myBet.tip_hosti  === match.vysledek_hosti)
              ? 'bg-pitch-100 text-pitch-700'
              : 'bg-red-100 text-red-700'
            : 'bg-blue-50 text-blue-700'
          }`}
        >
          {isSettled
            ? (myBet.tip_domaci === match.vysledek_domaci &&
               myBet.tip_hosti  === match.vysledek_hosti)
              ? `✅ Trefil jsi! Tip: ${myBet.tip_domaci}:${myBet.tip_hosti} · Výhra: ${myBet.vyhra} Kč`
              : `❌ Netrefil jsi · Tip: ${myBet.tip_domaci}:${myBet.tip_hosti}`
            : `📝 Tvůj tip: ${myBet.tip_domaci} : ${myBet.tip_hosti}`
          }
        </div>
      )}

      {/* Průběh zápasu */}
      {!compact && isLive && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#facc15', textTransform: 'uppercase', marginBottom: 6 }}>● Průběh</div>
          <MatchEvents matchId={match.id} live />
        </div>
      )}

      {!compact && !isLive && (isEnded || isSettled) && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowEvents(v => !v) }}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <span>📋 Detail zápasu</span>
            <span>{showEvents ? '▲' : '▼'}</span>
          </button>
          {showEvents && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
              <MatchEvents matchId={match.id} />
            </div>
          )}
        </div>
      )}

      {/* CTA tlačítko – jen když není compact a není zamčeno */}
      {!compact && !locked && (
        <button
          onClick={e => { e.stopPropagation(); handleTip() }}
          className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
            hasBet
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'bg-pitch-600 text-white hover:bg-pitch-700'
          }`}
        >
          {hasBet ? '✏️ Upravit tip' : '+ Zadat tip'}
        </button>
      )}
    </div>
  )
}
