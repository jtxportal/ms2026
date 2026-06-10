import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [hoursBefore, setHoursBefore] = useState(2)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [myBets,      setMyBets]      = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!profile) return
    setNotifyEmail(profile.notify_email ?? false)
    setHoursBefore(profile.notify_hours_before ?? 2)
    fetchMyBets()
  }, [profile])

  async function fetchMyBets() {
    const { data } = await supabase
      .from('bets')
      .select('*, match:match_id(vykop, faze, skupina, tym_domaci, tym_hosti, vyhodnoceno)')
      .eq('user_id', user.id)
      .order('match(vykop)', { ascending: false })
    setMyBets(data ?? [])
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ notify_email: notifyEmail, notify_hours_before: hoursBefore })
      .eq('id', user.id)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const betsPlaced     = myBets.length
  const betsSettled    = myBets.filter(b => b.match?.vyhodnoceno).length
  const betsPending    = myBets.filter(b => !b.match?.vyhodnoceno).length
  const betsChanged    = myBets.filter(b => b.update_count >= 1).length

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl text-gray-900">👤 Profil</h1>

      {/* Základní info */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-3">Moje informace</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Přezdívka</span>
            <span className="font-semibold text-gray-900">{profile?.prezdivka}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Jméno</span>
            <span className="font-semibold text-gray-900">{profile?.jmeno} {profile?.prijmeni}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Telefon</span>
            <span className="font-semibold text-gray-900">{profile?.telefon || '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Email</span>
            <span className="font-semibold text-gray-900 text-xs">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Statistiky mých tipů */}
      {!loading && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3">Moje tipy</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{betsPlaced}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tipů celkem</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pitch-600">{betsSettled}</div>
              <div className="text-xs text-gray-500 mt-0.5">Vyhodnoceno</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{betsPending}</div>
              <div className="text-xs text-gray-500 mt-0.5">Čeká na výsledek</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{betsChanged}</div>
              <div className="text-xs text-gray-500 mt-0.5">Tipů změněno</div>
            </div>
          </div>
        </div>
      )}

      {/* Notifikace */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">🔔 Upozornění</h2>
        <p className="text-xs text-gray-500 mb-4">Připomenu ti zápasy, na které ještě nemáš tip.</p>

        {/* Email notifikace */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-sm text-gray-800">E-mail upozornění</p>
            <p className="text-xs text-gray-500">Dostávat email před nezatipovanými zápasy</p>
          </div>
          <button
            onClick={() => setNotifyEmail(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${notifyEmail ? 'bg-pitch-600' : 'bg-gray-200'}`}
          >
            <span className={`block w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${notifyEmail ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Kolik hodin předem */}
        {notifyEmail && (
          <div className="py-3 border-b border-gray-100">
            <p className="font-medium text-sm text-gray-800 mb-2">Upozornit před zápasem</p>
            <div className="flex gap-2">
              {[1, 2, 4, 12, 24].map(h => (
                <button key={h}
                  onClick={() => setHoursBefore(h)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    hoursBefore === h ? 'bg-pitch-600 text-white border-pitch-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp — připravujeme */}
        <div className="flex items-center justify-between py-3 opacity-50">
          <div>
            <p className="font-medium text-sm text-gray-800">WhatsApp upozornění</p>
            <p className="text-xs text-gray-500">Připravujeme — brzy k dispozici</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Brzy</span>
        </div>

        {saved && <div className="mb-3 bg-pitch-50 text-pitch-700 text-sm rounded-xl px-3 py-2">✅ Nastavení uloženo</div>}

        <button onClick={saveSettings} disabled={saving} className="btn-primary w-full mt-2">
          {saving ? 'Ukládám…' : 'Uložit nastavení'}
        </button>
      </div>
    </div>
  )
}
