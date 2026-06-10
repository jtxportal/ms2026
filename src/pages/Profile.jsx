import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, profile } = useAuth()
  const [notifyEmail,    setNotifyEmail]    = useState(false)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false)
  const [hoursBefore,    setHoursBefore]    = useState(24)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [myBets,         setMyBets]         = useState([])
  const [upcomingNoBet,  setUpcomingNoBet]  = useState([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (!profile) return
    setNotifyEmail(profile.notify_email ?? false)
    setNotifyWhatsapp(profile.notify_whatsapp ?? false)
    setHoursBefore(profile.notify_hours_before ?? 24)
    fetchData()
  }, [profile])

  async function fetchData() {
    // Moje tipy
    const { data: bets } = await supabase
      .from('bets')
      .select('*, match:match_id(vykop, faze, vyhodnoceno)')
      .eq('user_id', user.id)

    // Nadcházející zápasy bez tipu (příštích 24h)
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const { data: upcoming } = await supabase
      .from('matches')
      .select('*, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev)')
      .gte('vykop', now.toISOString())
      .lte('vykop', in24h.toISOString())
      .eq('vyhodnoceno', false)
      .order('vykop')

    const betMatchIds = new Set((bets ?? []).map(b => b.match_id))
    setMyBets(bets ?? [])
    setUpcomingNoBet((upcoming ?? []).filter(m => !betMatchIds.has(m.id)))
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    await supabase.from('profiles').update({
      notify_email:        notifyEmail,
      notify_whatsapp:     notifyWhatsapp,
      notify_hours_before: hoursBefore,
    }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  function Toggle({ value, onChange }) {
    return (
      <button onClick={() => onChange(!value)}
        style={{ width: '46px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s', background: value ? '#e8a020' : 'rgba(255,255,255,0.15)' }}>
        <span style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: value ? '25px' : '3px' }} />
      </button>
    )
  }

  const betsPlaced   = myBets.length
  const betsSettled  = myBets.filter(b => b.match?.vyhodnoceno).length
  const betsPending  = myBets.filter(b => !b.match?.vyhodnoceno).length

  function formatTime(iso) {
    const d = new Date(iso)
    return d.toLocaleString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>👤 Profil</h1>

      {/* Upozornění — zápasy bez tipu v příštích 24h */}
      {!loading && upcomingNoBet.length > 0 && (
        <div style={{ background: 'rgba(196,18,48,0.15)', border: '1px solid rgba(196,18,48,0.4)', borderRadius: '14px', padding: '14px 16px' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#ff8080', margin: '0 0 8px' }}>
            ⚠️ {upcomingNoBet.length} zápas{upcomingNoBet.length > 1 ? 'y' : ''} bez tipu v příštích 24 hodinách!
          </p>
          {upcomingNoBet.map(m => (
            <div key={m.id} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', padding: '3px 0' }}>
              ⚽ {m.domaci?.nazev} vs {m.hosti?.nazev} · {formatTime(m.vykop)} CEST
            </div>
          ))}
        </div>
      )}
      {!loading && upcomingNoBet.length === 0 && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '14px', padding: '12px 16px', fontSize: '13px', color: '#4ade80' }}>
          ✅ Máš tipy na všechny zápasy v příštích 24 hodinách
        </div>
      )}

      {/* Základní info */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 12px' }}>Moje informace</h2>
        {[
          ['Přezdívka', profile?.prezdivka],
          ['Jméno', `${profile?.jmeno ?? ''} ${profile?.prijmeni ?? ''}`.trim()],
          ['Telefon', profile?.telefon || '—'],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '13px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Statistiky */}
      {!loading && (
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 12px' }}>Moje tipy</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[[betsPlaced, 'Celkem'], [betsSettled, 'Vyhodnoceno'], [betsPending, 'Čeká']].map(([v, l]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifikace */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', color: '#fff', margin: '0 0 4px' }}>🔔 Upozornění</h2>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Připomenu ti zápasy, na které ještě nemáš tip
        </p>

        {/* Email */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff', margin: '0 0 2px' }}>📧 E-mail upozornění</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Zdarma · vyžaduje nastavení Resend</p>
          </div>
          <Toggle value={notifyEmail} onChange={setNotifyEmail} />
        </div>

        {/* WhatsApp */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#fff', margin: '0 0 2px' }}>💬 WhatsApp upozornění</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Přes Twilio · ~$0.07/zpráva</p>
          </div>
          <Toggle value={notifyWhatsapp} onChange={setNotifyWhatsapp} />
        </div>

        {/* Kolik hodin předem */}
        {(notifyEmail || notifyWhatsapp) && (
          <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontWeight: 600, fontSize: '13px', color: '#fff', margin: '0 0 8px' }}>Upozornit před výkopem</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 4, 12, 24, 48].map(h => (
                <button key={h} onClick={() => setHoursBefore(h)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: hoursBefore === h ? '#e8a020' : 'rgba(255,255,255,0.1)', color: hoursBefore === h ? '#000' : '#fff' }}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info box */}
        <div style={{ marginTop: '12px', background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          💡 <strong style={{ color: '#00b4c8' }}>Email zdarma</strong> přes Resend.com (3 000/měsíc). <strong style={{ color: '#e8a020' }}>WhatsApp</strong> přes Twilio (~$5 pro celý turnaj). Odesílání bude aktivní po dokončení nastavení administrátorem.
        </div>

        {saved && <div style={{ marginTop: '10px', color: '#4ade80', fontSize: '13px', textAlign: 'center' }}>✅ Nastavení uloženo</div>}

        <button onClick={saveSettings} disabled={saving}
          style={{ marginTop: '12px', width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8a020, #c87010)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Ukládám…' : 'Uložit nastavení'}
        </button>
      </div>
    </div>
  )
}
