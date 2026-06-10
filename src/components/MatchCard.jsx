import { useNavigate } from 'react-router-dom'
import { formatDate, formatTime, isBeforeKickoff, minutesUntilKickoff,
         FAZE_LABEL, FAZE_COLOR, FAZE_CENA } from '../lib/utils'

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

  const hasBet   = myBet != null
  const hasResult = match.vysledek_domaci != null

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
          <span className="text-xs text-gray-500">{formatDate(match.vykop)}</span>
          <span className="text-xs text-gray-700 font-semibold ml-2">{formatTime(match.vykop)}</span>
          {!locked && mins < 60 && mins > 0 && (
            <span className="ml-1 text-xs text-red-500 font-medium">({mins} min)</span>
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
            <div className="text-xl font-bold text-gray-900">
              {match.vysledek_domaci} : {match.vysledek_hosti}
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
          ${hasResult
            ? (myBet.tip_domaci === match.vysledek_domaci &&
               myBet.tip_hosti  === match.vysledek_hosti)
              ? 'bg-pitch-100 text-pitch-700'
              : 'bg-gray-100 text-gray-500'
            : 'bg-blue-50 text-blue-700'
          }`}
        >
          {hasResult
            ? (myBet.tip_domaci === match.vysledek_domaci &&
               myBet.tip_hosti  === match.vysledek_hosti)
              ? `✅ Trefil jsi! Tip: ${myBet.tip_domaci}:${myBet.tip_hosti} · Výhra: ${myBet.vyhra} Kč`
              : `❌ Netrefil jsi · Tip: ${myBet.tip_domaci}:${myBet.tip_hosti}`
            : `📝 Tvůj tip: ${myBet.tip_domaci} : ${myBet.tip_hosti}`
          }
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
