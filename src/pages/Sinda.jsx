import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Sinda() {
  const { isAdmin, profile } = useAuth()
  const [notices,  setNotices]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editId,   setEditId]   = useState(null)
  const [newText,  setNewText]  = useState('')
  const [newImg,   setNewImg]   = useState('')
  const [newAutor, setNewAutor] = useState('Šinďa')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchNotices() }, [])

  async function fetchNotices() {
    const { data } = await supabase
      .from('admin_notices')
      .select('*')
      .order('created_at', { ascending: false })
    setNotices(data ?? [])
    setLoading(false)
  }

  async function saveNotice() {
    if (!newText.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('admin_notices').update({
        content: newText.trim(),
        image_url: newImg.trim() || null,
        autor: newAutor.trim() || 'Šinďa',
        updated_at: new Date().toISOString(),
      }).eq('id', editId)
      setMsg('Příspěvek upraven ✅')
    } else {
      await supabase.from('admin_notices').insert({
        content: newText.trim(),
        image_url: newImg.trim() || null,
        autor: newAutor.trim() || 'Šinďa',
      })
      setMsg('Příspěvek přidán ✅')
    }
    setNewText(''); setNewImg(''); setNewAutor('Šinďa')
    setEditId(null); setShowForm(false)
    setTimeout(() => setMsg(''), 2000)
    setSaving(false)
    fetchNotices()
  }

  async function deleteNotice(id) {
    if (!window.confirm('Smazat příspěvek?')) return
    await supabase.from('admin_notices').delete().eq('id', id)
    fetchNotices()
  }

  function startEdit(n) {
    setEditId(n.id); setNewText(n.content)
    setNewImg(n.image_url ?? ''); setNewAutor(n.autor ?? 'Šinďa')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('cs-CZ', {
      day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Prague'
    })
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '6px' }}>🎭</div>
        <h1 style={{ fontWeight: 900, fontSize: '22px', color: '#e8a020', margin: '0 0 4px' }}>
          Šinďovo vtipný okno
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Novinky, vtipy a důležitá hlášení od Šinďi
        </p>
      </div>

      {msg && (
        <div style={{ marginBottom: '12px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#4ade80', textAlign: 'center' }}>
          {msg}
        </div>
      )}

      {/* Admin formulář */}
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(232,160,32,0.15)', border: '1px dashed rgba(232,160,32,0.4)', color: '#e8a020', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
              + Přidat nový příspěvek
            </button>
          ) : (
            <div style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#e8a020', margin: '0 0 12px' }}>
                {editId ? '✏️ Upravit příspěvek' : '✍️ Nový příspěvek'}
              </h3>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Autor</label>
                <input value={newAutor} onChange={e => setNewAutor(e.target.value)} placeholder="Šinďa"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Text / vtip / zpráva</label>
                <textarea value={newText} onChange={e => setNewText(e.target.value)}
                  placeholder="Napiš vtip, důležitou zprávu nebo cokoliv jiného..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL obrázku (nepovinné)</label>
                <input value={newImg} onChange={e => setNewImg(e.target.value)}
                  placeholder="https://... (odkaz na jpg/png/gif)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                {newImg && <img src={newImg} alt="preview" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={saveNotice} disabled={!newText.trim() || saving}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8a020, #c87010)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px', opacity: !newText.trim() ? 0.5 : 1 }}>
                  {saving ? 'Ukládám…' : editId ? 'Uložit' : 'Zveřejnit'}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); setNewText(''); setNewImg(''); setNewAutor('Šinďa') }}
                  style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                  Zrušit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Příspěvky */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '32px' }}>🎭</div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🦗</div>
          Šinďa zatím nic nepřidal...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notices.map(n => (
            <div key={n.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,160,32,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* Header příspěvku */}
              <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎭</span>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#e8a020' }}>{n.autor}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>{formatDate(n.updated_at || n.created_at)}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => startEdit(n)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,180,200,0.15)', border: '1px solid rgba(0,180,200,0.3)', color: '#00b4c8', cursor: 'pointer', fontWeight: 600 }}>✏️</button>
                    <button onClick={() => deleteNotice(n.id)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(196,18,48,0.15)', border: '1px solid rgba(196,18,48,0.3)', color: '#ff8080', cursor: 'pointer', fontWeight: 600 }}>🗑</button>
                  </div>
                )}
              </div>

              {/* Obsah */}
              <div style={{ padding: '10px 16px' }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{n.content}</p>
              </div>

              {/* Obrázek */}
              {n.image_url && (
                <div style={{ padding: '0 16px 14px' }}>
                  <img src={n.image_url} alt="" style={{ width: '100%', borderRadius: '10px', maxHeight: '400px', objectFit: 'contain' }}
                    onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
