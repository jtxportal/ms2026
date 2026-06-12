import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SindaWidget() {
  const [notice,  setNotice]  = useState(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('admin_notices')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setNotice(data); setLoading(false) })
  }, [])

  if (loading) return null

  return (
    <div style={{ background: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: '16px', padding: '16px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🎭</span>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#e8a020' }}>Šinďovo vtipný vokno</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px', borderTop: '1px solid rgba(232,160,32,0.15)', paddingTop: '14px' }}>
          {!notice ? (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0', margin: 0 }}>
              🦗 Šinďa zatím nic nepřidal...
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#e8a020' }}>{notice.autor ?? 'Šinďa'}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(notice.updated_at || notice.created_at).toLocaleString('cs-CZ', {
                    day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
                    timeZone: 'Europe/Prague'
                  })}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {notice.content}
              </p>
              {notice.image_url && (
                <img src={notice.image_url} alt=""
                  style={{ marginTop: '12px', width: '100%', borderRadius: '10px', maxHeight: '400px', objectFit: 'contain' }}
                  onError={e => e.target.style.display='none'} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
