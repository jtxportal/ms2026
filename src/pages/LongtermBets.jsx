import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const UZAVERKA_UTC = '2026-06-17T06:00:00Z' // Po odehraném 1. kole skupin

const TEAMS_48 = [
  'Alžírsko','Argentina','Austrálie','Belgie','Bosna a Hercegovina',
  'Brazílie','Česko','Chorvatsko','DR Kongo','Egypt','Ekvádor',
  'Francie','Ghana','Haiti','Irák','Írán','Japonsko','Jihoafrická republika',
  'Jordánsko','Kanada','Kanárovy ostrovy','Kapverdy','Katar','Kolumbie',
  'Korea','Curaçao','Maroko','Mexiko','Německo','Nizozemsko','Norsko',
  'Nový Zéland','Panama','Paraguay','Pobřeží slonoviny','Polsko',
  'Portugalsko','Rakousko','Saúdská Arábie','Senegal','Skotsko',
  'Španělsko','Švýcarsko','Türkiye','Tunisko','Uruguay','USA','Uzbekistán',
].sort()

const PLAYERS = [
  { name: "Lionel Messi", team: "Argentina" },
  { name: "Julián Álvarez", team: "Argentina" },
  { name: "Enzo Fernández", team: "Argentina" },
  { name: "Lautaro Martínez", team: "Argentina" },
  { name: "Paulo Dybala", team: "Argentina" },
  { name: "Vinícius Jr.", team: "Brazílie" },
  { name: "Rodrygo", team: "Brazílie" },
  { name: "Raphinha", team: "Brazílie" },
  { name: "Gabriel Jesus", team: "Brazílie" },
  { name: "Neymar", team: "Brazílie" },
  { name: "Kylian Mbappé", team: "Francie" },
  { name: "Antoine Griezmann", team: "Francie" },
  { name: "Ousmane Dembélé", team: "Francie" },
  { name: "Kingsley Coman", team: "Francie" },
  { name: "Harry Kane", team: "Anglie" },
  { name: "Jude Bellingham", team: "Anglie" },
  { name: "Bukayo Saka", team: "Anglie" },
  { name: "Phil Foden", team: "Anglie" },
  { name: "Marcus Rashford", team: "Anglie" },
  { name: "Thomas Müller", team: "Německo" },
  { name: "Florian Wirtz", team: "Německo" },
  { name: "Jamal Musiala", team: "Německo" },
  { name: "Kai Havertz", team: "Německo" },
  { name: "Leroy Sané", team: "Německo" },
  { name: "Pedri", team: "Španělsko" },
  { name: "Lamine Yamal", team: "Španělsko" },
  { name: "Álvaro Morata", team: "Španělsko" },
  { name: "Dani Olmo", team: "Španělsko" },
  { name: "Rodri", team: "Španělsko" },
  { name: "Cody Gakpo", team: "Nizozemsko" },
  { name: "Memphis Depay", team: "Nizozemsko" },
  { name: "Xavi Simons", team: "Nizozemsko" },
  { name: "Frenkie de Jong", team: "Nizozemsko" },
  { name: "Cristiano Ronaldo", team: "Portugalsko" },
  { name: "Rafael Leão", team: "Portugalsko" },
  { name: "Bernardo Silva", team: "Portugalsko" },
  { name: "Bruno Fernandes", team: "Portugalsko" },
  { name: "João Félix", team: "Portugalsko" },
  { name: "Kevin De Bruyne", team: "Belgie" },
  { name: "Romelu Lukaku", team: "Belgie" },
  { name: "Jérémy Doku", team: "Belgie" },
  { name: "Lois Openda", team: "Belgie" },
  { name: "Luka Modrić", team: "Chorvatsko" },
  { name: "Andrej Kramarić", team: "Chorvatsko" },
  { name: "Mateo Kovačić", team: "Chorvatsko" },
  { name: "Patrik Schick", team: "Česko" },
  { name: "Tomáš Souček", team: "Česko" },
  { name: "Adam Hložek", team: "Česko" },
  { name: "Jan Kuchta", team: "Česko" },
  { name: "Robert Lewandowski", team: "Polsko" },
  { name: "Piotr Zieliński", team: "Polsko" },
  { name: "Arkadiusz Milik", team: "Polsko" },
  { name: "Erling Haaland", team: "Norsko" },
  { name: "Martin Ødegaard", team: "Norsko" },
  { name: "Christian Pulisic", team: "USA" },
  { name: "Tyler Adams", team: "USA" },
  { name: "Giovanni Reyna", team: "USA" },
  { name: "Timothy Weah", team: "USA" },
  { name: "Alphonso Davies", team: "Kanada" },
  { name: "Jonathan David", team: "Kanada" },
  { name: "Hirving Lozano", team: "Mexiko" },
  { name: "Raúl Jiménez", team: "Mexiko" },
  { name: "Son Heung-min", team: "Korea" },
  { name: "Kim Min-jae", team: "Korea" },
  { name: "Hwang Hee-chan", team: "Korea" },
  { name: "Takumi Minamino", team: "Japonsko" },
  { name: "Kaoru Mitoma", team: "Japonsko" },
  { name: "Daichi Kamada", team: "Japonsko" },
  { name: "Mohamed Salah", team: "Egypt" },
  { name: "Sadio Mané", team: "Senegal" },
  { name: "Hakim Ziyech", team: "Maroko" },
  { name: "Achraf Hakimi", team: "Maroko" },
  { name: "Youssef En-Nesyri", team: "Maroko" },
  { name: "Riyad Mahrez", team: "Alžírsko" },
  { name: "Salem Al-Dawsari", team: "Saúdská Arábie" },
  { name: "Luis Suárez", team: "Uruguay" },
  { name: "Darwin Núñez", team: "Uruguay" },
  { name: "Federico Valverde", team: "Uruguay" },
  { name: "Luis Díaz", team: "Kolumbie" },
  { name: "James Rodríguez", team: "Kolumbie" },
  { name: "Granit Xhaka", team: "Švýcarsko" },
  { name: "Hakan Çalhanoğlu", team: "Türkiye" },
  { name: "Arda Güler", team: "Türkiye" },
  { name: "Percy Tau", team: "Jihoafrická republika" },
  { name: "Enner Valencia", team: "Ekvádor" },
].sort((a, b) => a.name.localeCompare(b.name))

export default function LongtermBets() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [myBets,    setMyBets]    = useState({ vitez: null, strelec: null })
  const [vitezQ,    setVitezQ]    = useState('')
  const [vitez,     setVitez]     = useState('')
  const [strelecQ,  setStrelecQ]  = useState('')
  const [strelec,   setStrelec]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState({})
  const [success,   setSuccess]   = useState({})
  const [error,     setError]     = useState({})
  const [showTeams, setShowTeams] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)

  const isOpen = new Date(UZAVERKA_UTC) > new Date()

  const filteredTeams = vitezQ.length > 0
    ? TEAMS_48.filter(t => t.toLowerCase().includes(vitezQ.toLowerCase())).slice(0, 8)
    : []

  const filteredPlayers = strelecQ.length >= 2
    ? PLAYERS.filter(p =>
        p.name.toLowerCase().includes(strelecQ.toLowerCase()) ||
        p.team.toLowerCase().includes(strelecQ.toLowerCase())
      ).slice(0, 10)
    : []

  useEffect(() => {
    if (!user) return
    fetchMyBets()
  }, [user])

  async function fetchMyBets() {
    const { data } = await supabase.from('longterm_bets').select('*').eq('user_id', user.id)
    const map = { vitez: null, strelec: null }
    ;(data ?? []).forEach(b => { map[b.typ] = b })
    setMyBets(map)
    if (map.vitez)   setVitez(map.vitez.hodnota)
    if (map.strelec) setStrelec(map.strelec.hodnota)
    setLoading(false)
  }

  async function saveBet(typ, hodnota) {
    if (!hodnota.trim()) return
    setSaving(s => ({ ...s, [typ]: true }))
    setError(e => ({ ...e, [typ]: '' }))
    try {
      const existing = myBets[typ]
      if (existing) {
        const { error: err } = await supabase.from('longterm_bets').update({ hodnota: hodnota.trim() }).eq('id', existing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('longterm_bets').insert({ user_id: user.id, typ, hodnota: hodnota.trim(), castka: 20 })
        if (err) throw err
      }
      setSuccess(s => ({ ...s, [typ]: true }))
      setTimeout(() => setSuccess(s => ({ ...s, [typ]: false })), 2000)
      await fetchMyBets()
    } catch (err) {
      setError(e => ({ ...e, [typ]: err.message ?? 'Chyba' }))
    } finally {
      setSaving(s => ({ ...s, [typ]: false }))
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div style={{ fontSize: '40px' }}>⚽</div></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontWeight: 800, fontSize: '20px', color: '#fff', margin: 0 }}>Dlouhodobé tipy 🎯</h1>

      {/* Uzávěrka */}
      <div style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '13px', background: isOpen ? 'rgba(0,180,200,0.1)' : 'rgba(196,18,48,0.1)', border: isOpen ? '1px solid rgba(0,180,200,0.3)' : '1px solid rgba(196,18,48,0.3)', color: isOpen ? '#00b4c8' : '#ff8080' }}>
        {isOpen
          ? '✅ Tipy jsou otevřeny · uzávěrka: po 1. kole skupin (cca 17. 6. 2026)'
          : '🔒 Uzávěrka proběhla · tipy jsou uzamčeny'}
      </div>

      {/* Vítěz MS */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>🏆 Vítěz MS 2026</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Sázka: <strong style={{ color: '#e8a020' }}>20 Kč</strong> · Bank se dělí mezi výherce</p>
        </div>

        {myBets.vitez && (
          <div style={{ marginBottom: '10px', background: 'rgba(0,100,200,0.15)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#fff' }}>
            Aktuální tip: <strong style={{ color: '#00b4c8' }}>{myBets.vitez.hodnota}</strong>
          </div>
        )}
        {error.vitez && <div style={{ marginBottom: '10px', color: '#ff8080', fontSize: '12px' }}>{error.vitez}</div>}
        {success.vitez && <div style={{ marginBottom: '10px', color: '#4ade80', fontSize: '12px' }}>✅ Uloženo!</div>}

        {isOpen && (
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Začni psát název týmu…"
              value={vitezQ || vitez}
              onChange={e => { setVitezQ(e.target.value); if (!e.target.value) setVitez('') }}
            />
            {filteredTeams.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1535', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', zIndex: 20, maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {filteredTeams.map(t => (
                  <button key={t} onClick={() => { setVitez(t); setVitezQ('') }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', fontSize: '14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {vitez && !vitezQ && (
              <div style={{ marginTop: '8px', background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e8a020' }}>
                Vybráno: <strong>{vitez}</strong>
              </div>
            )}
            <button onClick={() => saveBet('vitez', vitez)} disabled={!vitez || saving.vitez}
              style={{ marginTop: '10px', width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8a020, #c87010)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px', opacity: !vitez ? 0.5 : 1 }}>
              {saving.vitez ? 'Ukládám…' : myBets.vitez ? 'Aktualizovat' : 'Vsadit 20 Kč'}
            </button>
          </div>
        )}
      </div>

      {/* Nejlepší střelec */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>⚽ Nejlepší střelec</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Sázka: <strong style={{ color: '#e8a020' }}>20 Kč</strong> · {PLAYERS.length} hvězdných hráčů v databázi</p>
        </div>

        {myBets.strelec && (
          <div style={{ marginBottom: '10px', background: 'rgba(0,100,200,0.15)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#fff' }}>
            Aktuální tip: <strong style={{ color: '#00b4c8' }}>{myBets.strelec.hodnota}</strong>
          </div>
        )}
        {error.strelec && <div style={{ marginBottom: '10px', color: '#ff8080', fontSize: '12px' }}>{error.strelec}</div>}
        {success.strelec && <div style={{ marginBottom: '10px', color: '#4ade80', fontSize: '12px' }}>✅ Uloženo!</div>}

        {isOpen && (
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Jméno hráče nebo tým…"
              value={strelecQ || strelec}
              onChange={e => { setStrelecQ(e.target.value); setStrelec(e.target.value) }}
            />
            {filteredPlayers.length > 0 && strelecQ.length >= 2 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1535', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', zIndex: 20, maxHeight: '220px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {filteredPlayers.map((p, i) => (
                  <button key={i} onClick={() => { setStrelec(p.name); setStrelecQ('') }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{p.team}</span>
                  </button>
                ))}
              </div>
            )}
            {strelec && !strelecQ && (
              <div style={{ marginTop: '8px', background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e8a020' }}>
                Vybráno: <strong>{strelec}</strong>
              </div>
            )}
            <button onClick={() => saveBet('strelec', strelec)} disabled={!strelec.trim() || saving.strelec}
              style={{ marginTop: '10px', width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8a020, #c87010)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px', opacity: !strelec.trim() ? 0.5 : 1 }}>
              {saving.strelec ? 'Ukládám…' : myBets.strelec ? 'Aktualizovat' : 'Vsadit 20 Kč'}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 10px' }}>
          Bank se dělí rovným dílem · Nikdo netrefí → bank přechází do jackpotu
        </p>
        <button
          onClick={() => navigate('/zapasy')}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0,180,200,0.2), rgba(0,180,200,0.1))', border: '1px solid rgba(0,180,200,0.4)', color: '#00b4c8', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <span>⚽</span>
          <span>Tipovat jednotlivé zápasy</span>
          <span style={{ fontSize: '16px' }}>→</span>
        </button>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
          Přejde na dnešní zápasy v záložce Zápasy
        </p>
      </div>
    </div>
  )
}
