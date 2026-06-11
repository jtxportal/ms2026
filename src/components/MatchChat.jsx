import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Chat je otevřený 48h před a 24h po výkopu
function isChatOpen(vykop) {
  const now = new Date()
  const kickoff = new Date(vykop)
  const opens  = new Date(kickoff.getTime() - 48 * 60 * 60 * 1000)
  const closes = new Date(kickoff.getTime() + 24 * 60 * 60 * 1000)
  return now >= opens && now <= closes
}

function isChatLocked(vykop) {
  const now = new Date()
  const closes = new Date(new Date(vykop).getTime() + 24 * 60 * 60 * 1000)
  return now > closes
}

export default function MatchChat({ matchId, vykop, nazevD, nazevH }) {
  const { user, profile } = useAuth()
  const [open,    setOpen]    = useState(false)
  const [messages, setMessages] = useState([])
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const chatOpen   = isChatOpen(vykop)
  const chatLocked = isChatLocked(vykop)

  useEffect(() => {
    if (!open || !matchId) return
    fetchMessages()

    // Realtime subscription
    const sub = supabase
      .channel(`match_chat_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'chat_messages', filter: `match_id=eq.${matchId}`
      }, payload => {
        setMessages(m => [...m, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [open, matchId])

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
  }, [open, messages])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(prezdivka)')
      .eq('match_id', matchId)
      .order('created_at')
      .limit(100)
    setMessages(data ?? [])
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      match_id: matchId,
      user_id: user.id,
      zprava: text.trim(),
    })
    setText('')
    setSending(false)
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString('cs-CZ', {
      day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Prague'
    })
  }

  if (!chatOpen && !chatLocked) return null  // příliš brzy

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Toggle tlačítko */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 14px', borderRadius: '10px',
          background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)',
          color: '#00b4c8', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>💬 Diskuze k zápasu {messages.length > 0 ? `(${messages.length})` : ''}</span>
        <span style={{ fontSize: '10px', color: chatLocked ? 'rgba(255,255,255,0.35)' : '#00b4c8' }}>
          {chatLocked ? '🔒 Uzamčeno' : open ? '▲ Skrýt' : '▼ Zobrazit'}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{ marginTop: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,180,200,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Zprávy */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '12px' }}>
            {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center' }}>Načítám…</p>}
            {!loading && messages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Zatím žádné zprávy. Buď první! 🎙️
              </p>
            )}
            {messages.map((m, i) => {
              const isMe = m.user_id === user?.id
              return (
                <div key={m.id || i} style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isMe ? '#e8a020' : '#00b4c8' }}>
                      {m.profiles?.prezdivka ?? 'Hráč'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{formatTime(m.created_at)}</span>
                  </div>
                  <div style={{
                    maxWidth: '80%', padding: '7px 11px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.4,
                    background: isMe ? 'rgba(232,160,32,0.15)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${isMe ? 'rgba(232,160,32,0.25)' : 'rgba(255,255,255,0.1)'}`,
                    color: 'rgba(255,255,255,0.85)',
                  }}>
                    {m.zprava}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!chatLocked ? (
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <input
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Napiš zprávu…"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
              <button type="submit" disabled={!text.trim() || sending}
                style={{ padding: '8px 14px', borderRadius: '8px', background: '#00b4c8', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: !text.trim() ? 0.5 : 1 }}>
                →
              </button>
            </form>
          ) : (
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              🔒 Diskuze uzamčena 24h po zápase
            </div>
          )}
        </div>
      )}
    </div>
  )
}
