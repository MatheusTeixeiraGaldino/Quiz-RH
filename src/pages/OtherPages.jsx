import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  onSnapshot, query, collection, where,
  getDocs, orderBy, deleteDoc, doc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { RankItem } from '../components/UI'
import toast from 'react-hot-toast'

// ── RANKING ──────────────────────────────────────────────────────────────────
export function Ranking() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const playerId   = useStore(s => s.user?.uid)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'players'), where('roomId', '==', roomId)),
      s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score||0)-(a.score||0)))
    )
  }, [roomId])

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#4f46e5,#7c3aed,#db2777)', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'rgba(0,0,0,.2)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:'#fff' }}>OL Quiz! ⚡</span>
        <button onClick={() => history.back()} className="btn btn-sm" style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1.5px solid rgba(255,255,255,.25)', width:'auto' }}>← Voltar</button>
      </div>
      <div style={{ flex:1, padding:16, maxWidth:600, margin:'0 auto', width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:'#fff' }}>📊 Ranking</h2>
          <span style={{ background:'rgba(255,255,255,.15)', borderRadius:99, padding:'4px 14px', fontWeight:800, color:'#fff', fontSize:13 }}>👥 {players.length}</span>
        </div>
        {players.length === 0
          ? <div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ borderColor:'rgba(255,255,255,.3)', borderTopColor:'#fff' }} /></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {players.map((p, i) => <RankItem key={p.id} rank={i+1} player={p} isMe={p.id===playerId} delay={Math.min(i*35,300)} />)}
            </div>
        }
        <div style={{ marginTop:16 }}>
          <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-white" style={{ fontSize:15 }}>🏆 Ver pódio</button>
        </div>
      </div>
    </div>
  )
}

// ── QUIZ HISTORY ──────────────────────────────────────────────────────────────
export function QuizHistory() {
  const navigate = useNavigate()
  const [history] = useState(() => JSON.parse(localStorage.getItem('ql_history') || '[]'))

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'rgba(255,255,255,.7)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', borderBottom:'2px solid #dde3ff', position:'sticky', top:0, zIndex:200 }}>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, background:'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width:'auto' }}>← Home</button>
      </div>
      <div className="screen">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:'#1e1b4b' }}>🕓 Histórico</h2>
          {history.length > 0 && <button onClick={() => { localStorage.removeItem('ql_history'); window.location.reload() }} className="btn btn-danger btn-xs">Limpar</button>}
        </div>
        {history.length === 0
          ? <div className="card" style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <p style={{ color:'#6b7280', fontWeight:700 }}>Nenhum quiz criado ainda</p>
              <button onClick={() => navigate('/admin')} className="btn btn-primary" style={{ width:'auto', padding:'10px 24px', marginTop:16 }}>+ Criar quiz</button>
            </div>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {history.map((item, i) => (
                <div key={i} className="card" style={{ cursor:'pointer' }} onClick={() => navigate(`/room/${item.roomId}/control`)}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:16, color:'#1e1b4b' }}>{item.nome}</div>
                      <div style={{ fontSize:13, color:'#6b7280', marginTop:3, fontWeight:700 }}>
                        PIN: <strong style={{ fontFamily:"'Fredoka One',cursive", color:'#8b5cf6', letterSpacing:2 }}>{item.roomId}</strong> · {item.totalQuestions} perguntas · {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span style={{ color:'#8b5cf6', fontSize:20 }}>→</span>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button onClick={e => { e.stopPropagation(); navigate(`/room/${item.roomId}/podium`) }} className="btn btn-secondary btn-xs">🏆 Pódio</button>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}${location.pathname}#/join/${item.roomId}`); toast.success('Copiado!') }} className="btn btn-secondary btn-xs">📋 Link</button>
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
  const navigate   = useNavigate()
  const user       = useStore(s => s.user)
  const account    = useStore(s => s.account)
  const isLoggedIn = account && user && !user.isAnonymous

  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  // Filters: 'mine' | 'global' | 'shared'
  const [filter,    setFilter]    = useState('mine')

  const FILTERS = [
    { v: 'mine',   icon: '🔒', label: 'Meus' },
    { v: 'global', icon: '🌍', label: 'Globais' },
    { v: 'shared', icon: '👥', label: 'Comigo' },
  ]

  useEffect(() => {
    if (!isLoggedIn) { setTemplates([]); setLoading(false); return }
    loadTemplates()
  }, [filter, user?.uid, isLoggedIn])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      let q
      if (filter === 'mine') {
        // Templates owned by me
        q = query(collection(db, 'templates'), where('ownerUid', '==', user.uid))
      } else if (filter === 'global') {
        // Templates marked as global
        q = query(collection(db, 'templates'), where('tplAccess', '==', 'global'))
      } else {
        // Templates shared specifically with my email
        q = query(collection(db, 'templates'), where('sharedWith', 'array-contains', account.email))
      }
      const snap = await getDocs(q)
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0))
      setTemplates(items)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar templates')
    }
    setLoading(false)
  }

  const useTemplate = (t) => {
    localStorage.setItem('ql_template', JSON.stringify({ nome: t.nome, perguntas: t.perguntas }))
    navigate('/admin')
  }

  const deleteTemplate = async (t) => {
    if (!window.confirm(`Excluir o template "${t.nome}"?`)) return
    try {
      await deleteDoc(doc(db, 'templates', t.id))
      setTemplates(prev => prev.filter(x => x.id !== t.id))
      toast.success('Template excluído')
    } catch (e) {
      toast.error('Erro ao excluir: ' + e.message)
    }
  }

  const accessLabel = (t) => {
    if (t.tplAccess === 'global')  return { icon:'🌍', text:'Global',     color:'#10b981' }
    if (t.tplAccess === 'shared')  return { icon:'👥', text:`Compartilhado (${t.sharedWith?.length || 0})`, color:'#3b82f6' }
    return                                { icon:'🔒', text:'Privado',    color:'#8b5cf6' }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'rgba(255,255,255,.7)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(12px)', borderBottom:'2px solid #dde3ff', position:'sticky', top:0, zIndex:200 }}>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, background:'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width:'auto' }}>← Home</button>
      </div>

      <div className="screen">
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:'#1e1b4b' }}>📚 Templates</h2>

        {/* Not logged in */}
        {!isLoggedIn && (
          <div style={{ padding:'20px 16px', background:'#fef3c7', borderRadius:12, border:'2px solid #fbbf24', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🔐</div>
            <div style={{ fontWeight:800, fontSize:16, color:'#92400e', marginBottom:4 }}>Login necessário</div>
            <p style={{ fontSize:14, color:'#78350f', fontWeight:600, marginBottom:12 }}>
              Faça login para salvar, ver e compartilhar templates de quiz.
            </p>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width:'auto', padding:'10px 28px' }}>
              🔐 Fazer login
            </button>
          </div>
        )}

        {isLoggedIn && (
          <>
            {/* Filter tabs */}
            <div style={{ display:'flex', background:'#f5f3ff', borderRadius:12, padding:4, gap:2 }}>
              {FILTERS.map(({ v, icon, label }) => (
                <button key={v} onClick={() => setFilter(v)}
                  style={{ flex:1, padding:'9px 8px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, transition:'all .2s', background: filter===v ? '#8b5cf6' : 'transparent', color: filter===v ? '#fff' : '#6b7280' }}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Filter description */}
            <div style={{ fontSize:12, color:'#6b7280', fontWeight:600, marginTop:-4, paddingLeft:4 }}>
              {filter === 'mine'   && '📁 Templates que você criou'}
              {filter === 'global' && '🌍 Templates marcados como públicos por qualquer admin'}
              {filter === 'shared' && `👥 Templates compartilhados diretamente com ${account.email}`}
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:40 }}><div className="spinner" /></div>
            ) : templates.length === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:'40px 20px' }}>
                <div style={{ fontSize:48, marginBottom:10 }}>
                  {filter==='mine' ? '📭' : filter==='global' ? '🌐' : '📬'}
                </div>
                <p style={{ color:'#6b7280', fontWeight:700, marginBottom:12 }}>
                  {filter==='mine'   && 'Você ainda não salvou nenhum template'}
                  {filter==='global' && 'Nenhum template global disponível'}
                  {filter==='shared' && 'Nenhum template foi compartilhado com você'}
                </p>
                {filter === 'mine' && (
                  <button onClick={() => navigate('/admin')} className="btn btn-primary" style={{ width:'auto', padding:'10px 24px' }}>
                    + Criar quiz
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {templates.map(t => {
                  const acc = accessLabel(t)
                  const isOwner = t.ownerUid === user.uid
                  return (
                    <div key={t.id} className="card">
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:16, color:'#1e1b4b', marginBottom:4 }}>{t.nome}</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                            <span style={{ fontSize:12, fontWeight:700, color:'#6b7280' }}>
                              {t.perguntas?.length || 0} perguntas
                            </span>
                            <span style={{ fontSize:11, fontWeight:800, color:acc.color, background:`${acc.color}18`, borderRadius:99, padding:'2px 8px', border:`1px solid ${acc.color}44` }}>
                              {acc.icon} {acc.text}
                            </span>
                            {t.ownerEmail && (
                              <span style={{ fontSize:11, color:'#9ca3af', fontWeight:600 }}>
                                por {isOwner ? 'você' : t.ownerEmail}
                              </span>
                            )}
                            {t.criadoEm && (
                              <span style={{ fontSize:11, color:'#9ca3af', fontWeight:600 }}>
                                · {new Date(t.criadoEm.seconds * 1000).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          {/* Show who it's shared with (only for owner) */}
                          {isOwner && t.tplAccess === 'shared' && t.sharedWith?.length > 0 && (
                            <div style={{ marginTop:6, padding:'6px 10px', background:'#ede9fe', borderRadius:8, fontSize:11, fontWeight:700, color:'#5b21b6' }}>
                              👥 Compartilhado com: {t.sharedWith.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => useTemplate(t)} className="btn btn-primary btn-sm" style={{ flex:1 }}>
                          🚀 Usar template
                        </button>
                        {isOwner && (
                          <button onClick={() => deleteTemplate(t)} className="btn btn-danger btn-xs" style={{ flexShrink:0 }}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        <button onClick={() => navigate('/admin')} className="btn btn-secondary">+ Criar novo quiz</button>
      </div>
    </div>
  )
}
