import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { RankItem } from '../components/UI'

// ── RANKING ──────────────────────────────────────────────────────────────────
export function Ranking() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const playerId = useStore(s => s.user?.uid)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s =>
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0))))
    return u
  }, [roomId])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#4f46e5,#7c3aed,#db2777)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,.2)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: '#fff' }}>OL Quiz! ⚡</span>
        <button onClick={() => history.back()} className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.25)', width: 'auto' }}>← Voltar</button>
      </div>
      <div style={{ flex: 1, padding: 16, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: '#fff' }}>📊 Ranking</h2>
          <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 99, padding: '4px 14px', fontWeight: 800, color: '#fff', fontSize: 13 }}>👥 {players.length}</span>
        </div>
        {players.length === 0
          ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players.map((p, i) => <RankItem key={p.id} rank={i + 1} player={p} isMe={p.id === playerId} delay={Math.min(i * 35, 300)} />)}
            </div>
        }
        <div style={{ marginTop: 16 }}>
          <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-white" style={{ fontSize: 15 }}>🏆 Ver pódio</button>
        </div>
      </div>
    </div>
  )
}

// ── QUIZ HISTORY ─────────────────────────────────────────────────────────────
export function QuizHistory() {
  const navigate = useNavigate()
  const [history] = useState(() => JSON.parse(localStorage.getItem('ql_history') || '[]'))

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Home</button>
      </div>
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: '#1e1b4b' }}>🕓 Histórico</h2>
          {history.length > 0 && <button onClick={() => { localStorage.removeItem('ql_history'); window.location.reload() }} className="btn btn-danger btn-xs">Limpar</button>}
        </div>
        {history.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#6b7280', fontWeight: 700 }}>Nenhum quiz criado ainda</p>
              <button onClick={() => navigate('/admin')} className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px', marginTop: 16 }}>+ Criar quiz</button>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((item, i) => (
                <div key={i} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/room/${item.roomId}/control`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#1e1b4b' }}>{item.nome}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3, fontWeight: 700 }}>
                        PIN: <strong style={{ fontFamily: "'Fredoka One',cursive", color: '#8b5cf6', letterSpacing: 2 }}>{item.roomId}</strong> · {item.totalQuestions} perguntas · {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span style={{ color: '#8b5cf6', fontSize: 20 }}>→</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={e => { e.stopPropagation(); navigate(`/room/${item.roomId}/podium`) }} className="btn btn-secondary btn-xs">🏆 Pódio</button>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}${location.pathname}#/join/${item.roomId}`); toast?.success?.('Copiado!') }} className="btn btn-secondary btn-xs">📋 Link</button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

// ── QUIZ TEMPLATES ────────────────────────────────────────────────────────────
export function QuizTemplates() {
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const account = useStore(s => s.account)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'global' | 'mine'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        let q
        if (filter === 'global') {
          q = query(collection(db, 'templates'), where('visibility', '==', 'global'), orderBy('criadoEm', 'desc'))
        } else if (filter === 'mine' && user?.uid) {
          q = query(collection(db, 'templates'), where('ownerUid', '==', user.uid), orderBy('criadoEm', 'desc'))
        } else {
          q = query(collection(db, 'templates'), orderBy('criadoEm', 'desc'))
        }
        const snap = await getDocs(q)
        setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [filter, user?.uid])

  const useTemplate = (t) => {
    localStorage.setItem('ql_template', JSON.stringify({ nome: t.nome, perguntas: t.perguntas }))
    navigate('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Home</button>
      </div>
      <div className="screen">
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: '#1e1b4b' }}>📚 Templates de Quiz</h2>

        {/* Filter tabs */}
        <div style={{ display: 'flex', background: '#f5f3ff', borderRadius: 12, padding: 4 }}>
          {[['all','Todos'],['global','🌍 Globais'],['mine','🔒 Meus']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, transition: 'all .2s',
                background: filter === v ? '#8b5cf6' : 'transparent',
                color: filter === v ? '#fff' : '#6b7280',
              }}>{l}</button>
          ))}
        </div>

        {filter === 'mine' && !account && (
          <div style={{ padding: '12px 16px', background: '#fef3c7', borderRadius: 10, border: '1.5px solid #fbbf24', fontSize: 14, fontWeight: 700, color: '#92400e' }}>
            ⚠️ Faça login para ver seus templates.{' '}
            <button onClick={() => navigate('/login')} style={{ color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }}>Entrar</button>
          </div>
        )}

        {loading
          ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          : templates.length === 0
            ? <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🈳</div>
                <p style={{ color: '#6b7280', fontWeight: 700 }}>Nenhum template encontrado</p>
                <button onClick={() => navigate('/admin')} className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px', marginTop: 14 }}>+ Criar quiz</button>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates.map(t => (
                  <div key={t.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#1e1b4b' }}>{t.nome}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: 700 }}>
                          {t.perguntas?.length || 0} perguntas ·{' '}
                          <span className={`badge ${t.visibility === 'global' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: 10 }}>
                            {t.visibility === 'global' ? '🌍 Global' : '🔒 Privado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => useTemplate(t)} className="btn btn-primary btn-sm" style={{ width: 'auto' }}>
                      🚀 Usar este template
                    </button>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  )
}
