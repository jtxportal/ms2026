import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// roomType: 'tournament' | 'match'
// matchId:  number | null
export default function ChatPanel({ roomType = 'tournament', matchId = null, title = 'Chat' }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Načíst historii + subscribe na Realtime
  useEffect(() => {
    if (!user) return

    loadMessages()
    const channel = subscribeRealtime()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomType, matchId, user])

  // Scroll na konec při nových zprávách
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    setLoading(true)
    let query = supabase
      .from('chat_messages')
      .select(`
        id, content, created_at,
        profiles:user_id ( prezdivka )
      `)
      .eq('room_type', roomType)
      .order('created_at', { ascending: true })
      .limit(100)

    if (roomType === 'match' && matchId) {
      query = query.eq('match_id', matchId)
    }

    const { data } = await query
    setMessages(data ?? [])
    setLoading(false)
  }

  function subscribeRealtime() {
    const channelName = roomType === 'match'
      ? `chat:match:${matchId}`
      : 'chat:tournament'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: roomType === 'match'
            ? `match_id=eq.${matchId}`
            : `room_type=eq.tournament`,
        },
        async (payload) => {
          // Doplnit přezdívku (payload neobsahuje join)
          const { data } = await supabase
            .from('chat_messages')
            .select(`id, content, zprava, created_at, profiles:user_id ( prezdivka )`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => {
              // Vyhnout se duplikátům
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      )
      .subscribe()

    return channel
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    const { error } = await supabase.from('chat_messages').insert({
      room_type: roomType,
      match_id:  roomType === 'match' ? matchId : null,
      user_id:   user.id,
      content:   text,
      zprava:    text,
    })

    if (error) {
      setInput(text) // vrátit text při chybě
      console.error('Chat insert error:', error)
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function formatTime(ts) {
    const d = new Date(ts)
    return d.getHours().toString().padStart(2,'0') + ':' +
           d.getMinutes().toString().padStart(2,'0')
  }

  const isOwnMessage = (msg) => {
    return msg.profiles?.prezdivka === profile?.prezdivka
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '16px',
      overflow: 'hidden',
      height: '400px',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px' }}>💬</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
          {title}
        </span>
        {!loading && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
            {messages.length} zpráv
          </span>
        )}
      </div>

      {/* Zprávy */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '40px', fontSize: '13px' }}>
            Načítám zprávy…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: '40px', fontSize: '13px' }}>
            Zatím žádné zprávy. Buď první! 👋
          </div>
        ) : (
          messages.map(msg => {
            const own = isOwnMessage(msg)
            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: own ? 'flex-end' : 'flex-start',
              }}>
                {/* Přezdívka + čas */}
                <div style={{
                  fontSize: '10px', color: 'rgba(255,255,255,0.35)',
                  marginBottom: '2px',
                  display: 'flex', gap: '6px', alignItems: 'center',
                }}>
                  {!own && (
                    <span style={{ fontWeight: 700, color: 'rgba(0,180,200,0.8)' }}>
                      {msg.profiles?.prezdivka ?? '?'}
                    </span>
                  )}
                  <span>{formatTime(msg.created_at)}</span>
                  {own && (
                    <span style={{ fontWeight: 700, color: 'rgba(100,200,100,0.8)' }}>
                      ty
                    </span>
                  )}
                </div>
                {/* Bublina */}
                <div style={{
                  maxWidth: '80%',
                  padding: '7px 11px',
                  borderRadius: own ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  background: own
                    ? 'rgba(0,120,180,0.35)'
                    : 'rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex', gap: '8px', padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={500}
          placeholder="Napiš zprávu… (max 500 znaků)"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px', padding: '8px 14px',
            color: '#fff', fontSize: '13px', outline: 'none',
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            background: input.trim() ? '#1a6fbe' : 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: '50%',
            width: '36px', height: '36px',
            color: '#fff', fontSize: '16px', cursor: 'pointer',
            flexShrink: 0, transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ↑
        </button>
      </form>
    </div>
  )
}
