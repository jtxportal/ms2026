import ChatPanel from '../components/ChatPanel'

export default function TournamentChat() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
        💬 Turnajový chat
      </h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '-8px 0 0' }}>
        Obecná diskuze k MS 2026 — góly, drama, tipy
      </p>
      <ChatPanel
        roomType="tournament"
        matchId={null}
        title="Turnajový chat MS 2026"
      />
    </div>
  )
}
