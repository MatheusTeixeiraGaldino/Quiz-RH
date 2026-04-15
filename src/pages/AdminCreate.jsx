import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { AppLogo, Badge, OPT_COLORS, LABELS, generateRoomCode } from '../components/UI'
import toast from 'react-hot-toast'

const DEFAULT_Q = { type: 'multiple', pergunta: '', opcoes: ['', '', '', ''], correta: 0, pontuacao: 100, tempo: 30, imagem: '' }

function QuestionForm({ onSave, onCancel, initial }) {
  const [q, setQ] = useState(initial ? { ...initial } : { ...DEFAULT_Q, opcoes: ['', '', '', ''] })
  const setField = (k, v) => setQ(p => ({ ...p, [k]: v }))
  const setOpt = (i, v) => setQ(p => { const o = [...p.opcoes]; o[i] = v; return { ...p, opcoes: o } })
  const setType = (t) => setQ(p => ({ ...p, type: t, opcoes: t === 'truefalse' ? ['Verdadeiro', 'Falso'] : ['', '', '', ''], correta: 0 }))

  const addOpt = () => { if (q.opcoes.length < 6) setQ(p => ({ ...p, opcoes: [...p.opcoes, ''] })) }
  const removeOpt = (i) => {
    if (q.opcoes.length <= 2) return
    setQ(p => {
      const opcoes = p.opcoes.filter((_, j) => j !== i)
      const correta = p.correta >= opcoes.length ? 0 : p.correta === i ? 0 : p.correta > i ? p.correta - 1 : p.correta
      return { ...p, opcoes, correta }
    })
  }

  const save = () => {
    if (!q.pergunta.trim()) return toast.error('Digite o enunciado')
    if (q.opcoes.filter(o => o.trim()).length < 2) return toast.error('Ao menos 2 opções')
    if (!q.opcoes[q.correta]?.trim()) return toast.error('Marque a opção correta')
    onSave({ ...q, opcoes: q.opcoes.map(o => o.trim()) })
  }

  return (
    <div className="q-builder-inner">
      {/* Type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['multiple', '🔢 Múltipla'], ['truefalse', '✔ V/F']].map(([t, l]) => (
          <button key={t} onClick={() => setType(t)}
            className={`btn btn-sm ${q.type === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}>{l}</button>
        ))}
      </div>

      {/* Question */}
      <div style={{ marginBottom: 10 }}>
        <label className="lbl">Enunciado</label>
        <textarea value={q.pergunta} onChange={e => setField('pergunta', e.target.value)}
          placeholder="Digite a pergunta aqui…" rows={2} className="inp" />
      </div>

      {/* Image URL */}
      <div style={{ marginBottom: 10 }}>
        <label className="lbl">Imagem (URL — opcional)</label>
        <input value={q.imagem || ''} onChange={e => setField('imagem', e.target.value)}
          placeholder="https://…" className="inp" />
        {q.imagem && (
          <div style={{ position: 'relative', marginTop: 8 }}>
            <img src={q.imagem} alt="preview"
              style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, background: '#f5f3ff' }}
              onError={e => e.target.style.display = 'none'} />
            <button onClick={() => setField('imagem', '')}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontWeight: 700 }}>×</button>
          </div>
        )}
      </div>

      {/* Options */}
      <div style={{ marginBottom: 10 }}>
        <label className="lbl">Opções <span style={{ fontSize: 10, textTransform: 'none', color: '#a78bfa', fontWeight: 600 }}>(clique na letra para marcar a correta)</span></label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.opcoes.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setField('correta', i)} className="correct-dot"
                style={{ borderColor: OPT_COLORS[i], background: q.correta === i ? OPT_COLORS[i] : 'transparent', color: q.correta === i ? '#fff' : OPT_COLORS[i] }}>
                {LABELS[i]}
              </button>
              <input value={opt} onChange={e => setOpt(i, e.target.value)}
                placeholder={`Opção ${LABELS[i]}…`} className="inp" style={{ flex: 1 }}
                disabled={q.type === 'truefalse'} />
              {q.type !== 'truefalse' && q.opcoes.length > 2 && (
                <button onClick={() => removeOpt(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>
        {q.type !== 'truefalse' && q.opcoes.length < 6 && (
          <button onClick={addOpt} style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            + Adicionar opção
          </button>
        )}
      </div>

      {/* Pts + Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label className="lbl">Pontuação</label>
          <select value={q.pontuacao} onChange={e => setField('pontuacao', Number(e.target.value))} className="inp">
            {[50, 100, 150, 200, 300, 500, 1000].map(v => <option key={v} value={v}>{v} pts</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Tempo</label>
          <select value={q.tempo} onChange={e => setField('tempo', Number(e.target.value))} className="inp">
            {[10, 15, 20, 30, 45, 60, 90].map(v => <option key={v} value={v}>{v}s</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} className="btn btn-success" style={{ flex: 1 }}>
          ✓ {initial ? 'Salvar' : 'Adicionar'}
        </button>
        {onCancel && <button onClick={onCancel} className="btn btn-secondary btn-sm">Cancelar</button>}
      </div>
    </div>
  )
}

export default function AdminCreate() {
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const account = useStore(s => s.account)
  const [roomName, setRoomName] = useState('')
  const [questions, setQuestions] = useState([])
  const [adding, setAdding] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [creating, setCreating] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [autoInterval, setAutoInterval] = useState(5)
  const [visibility, setVisibility] = useState('private')
  const fileRef = useRef()

  React.useEffect(() => {
    const raw = localStorage.getItem('ql_template')
    if (raw) {
      try {
        const t = JSON.parse(raw)
        if (t.nome) setRoomName(t.nome)
        if (Array.isArray(t.perguntas)) setQuestions(t.perguntas)
        localStorage.removeItem('ql_template')
        toast.success('Template carregado!')
      } catch(e) {}
    }
  }, [])

  const addQ = (q) => { setQuestions(p => [...p, q]); setAdding(false); toast.success('Pergunta adicionada! ✅') }
  const saveEdit = (q) => { setQuestions(p => p.map((o, i) => i === editIdx ? q : o)); setEditIdx(null); toast.success('Atualizada! ✅') }
  const delQ = (i) => { setQuestions(p => p.filter((_, j) => j !== i)) }
  const moveQ = (i, d) => {
    setQuestions(p => {
      const a = [...p]; const j = i + d
      if (j < 0 || j >= a.length) return a
      ;[a[i], a[j]] = [a[j], a[i]]; return a
    })
  }

  const exportJSON = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ nome: roomName, perguntas: questions, visibility }, null, 2)], { type: 'application/json' }))
    a.download = `olquiz-${roomName || 'quiz'}.json`
    a.click(); toast.success('Exportado!')
  }

  const importJSON = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result)
        if (d.nome) setRoomName(d.nome)
        if (Array.isArray(d.perguntas)) { setQuestions(d.perguntas); toast.success(`${d.perguntas.length} perguntas importadas!`) }
        if (d.visibility) setVisibility(d.visibility)
      } catch { toast.error('Arquivo inválido') }
    }
    r.readAsText(f); e.target.value = ''
  }

  const createRoom = async () => {
    if (!roomName.trim()) return toast.error('Digite o nome da sala')
    if (!questions.length) return toast.error('Adicione ao menos uma pergunta')
    setCreating(true)
    try {
      const code = generateRoomCode() // 5-char alphanumeric
      // Use custom doc ID = the room code
      await setDoc(doc(db, 'rooms', code), {
        nome: roomName, status: 'waiting', currentQuestion: 0,
        adminUid: user?.uid || '', criadoEm: serverTimestamp(),
        totalQuestions: questions.length, autoMode, autoInterval,
        visibility, // 'private' or 'global'
      })

      // Save as template if global or user is logged in
      if (visibility === 'global' || account) {
        await addDoc(collection(db, 'templates'), {
          nome: roomName, perguntas: questions,
          visibility, ownerUid: user?.uid || '',
          criadoEm: serverTimestamp(),
        })
      }

      for (let i = 0; i < questions.length; i++) {
        await addDoc(collection(db, 'questions'), { ...questions[i], roomId: code, ordem: i })
      }

      const hist = JSON.parse(localStorage.getItem('ql_history') || '[]')
      hist.unshift({ roomId: code, nome: roomName, criadoEm: Date.now(), totalQuestions: questions.length })
      localStorage.setItem('ql_history', JSON.stringify(hist.slice(0, 20)))

      navigate(`/room/${code}/control`)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally { setCreating(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Voltar</button>
      </div>

      <div className="screen" style={{ maxWidth: 700 }}>
        {/* Room settings */}
        <div className="card">
          <div className="card-title">⚙️ Configurar sala</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="lbl">Nome da sala</label>
              <input value={roomName} onChange={e => setRoomName(e.target.value)}
                placeholder="Ex: Trivia de Ciências — Turma B" className="inp" />
            </div>

            {/* Visibility */}
            <div>
              <label className="lbl">Visibilidade do quiz</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  ['private', '🔒 Privado', 'Só você acessa'],
                  ['global', '🌍 Global', 'Qualquer admin usa'],
                ].map(([v, label, desc]) => (
                  <button key={v} onClick={() => setVisibility(v)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10, border: `2px solid ${visibility === v ? '#8b5cf6' : '#dde3ff'}`,
                      background: visibility === v ? '#f5f3ff' : '#fff', cursor: 'pointer',
                      fontFamily: "'Nunito',sans-serif", textAlign: 'left', transition: 'all .2s',
                    }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: visibility === v ? '#5b21b6' : '#1e1b4b' }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{desc}</div>
                  </button>
                ))}
              </div>
              {visibility === 'global' && !account && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, border: '1.5px solid #fbbf24', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                  ⚠️ Quiz global requer login. <button onClick={() => navigate('/login')} style={{ color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, textDecoration: 'underline' }}>Fazer login</button>
                </div>
              )}
            </div>

            {/* Auto mode */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#8b5cf6' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>Modo automático</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>(avança sozinho)</span>
            </label>
            {autoMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Intervalo:</span>
                <select value={autoInterval} onChange={e => setAutoInterval(Number(e.target.value))} className="inp" style={{ width: 'auto' }}>
                  {[3, 5, 8, 10, 15, 20].map(v => <option key={v} value={v}>{v}s</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Import/Export */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportJSON} className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled={!questions.length}>📤 Exportar JSON</button>
          <button onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📥 Importar JSON</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>

        {/* Questions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📋 Perguntas</div>
            <Badge variant="purple">{questions.length}</Badge>
          </div>

          {questions.length > 0 && (
            <div className="scroll-list" style={{ maxHeight: 300, marginBottom: 12 }}>
              {questions.map((q, i) => (
                editIdx === i ? (
                  <div key={i}><QuestionForm initial={q} onSave={saveEdit} onCancel={() => setEditIdx(null)} /></div>
                ) : (
                  <div key={i} className="q-item">
                    <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: '#8b5cf6', minWidth: 24 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {q.pergunta}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap', fontWeight: 700 }}>
                        <span>{q.pontuacao}pts</span><span>·</span><span>{q.tempo}s</span><span>·</span>
                        <span style={{ color: '#10b981' }}>✓ {LABELS[q.correta]}: {(q.opcoes[q.correta] || '').slice(0, 18)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button onClick={() => moveQ(i, -1)} disabled={i === 0} className="btn btn-ghost btn-xs">↑</button>
                      <button onClick={() => moveQ(i, 1)} disabled={i === questions.length - 1} className="btn btn-ghost btn-xs">↓</button>
                      <button onClick={() => setEditIdx(i)} className="btn btn-secondary btn-xs">✏️</button>
                      <button onClick={() => delQ(i)} className="btn btn-danger btn-xs">🗑</button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {adding ? (
            <QuestionForm onSave={addQ} onCancel={() => setAdding(false)} />
          ) : (
            <button onClick={() => setAdding(true)} className="btn btn-secondary" style={{ borderStyle: 'dashed', color: '#8b5cf6', fontWeight: 800 }}>
              + Adicionar pergunta
            </button>
          )}
        </div>

        <button onClick={createRoom} disabled={creating || !questions.length || !roomName.trim() || (visibility === 'global' && !account)}
          className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {creating
            ? <><div className="spinner-sm" style={{ border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', width: 20, height: 20 }} /> Criando…</>
            : '🚀 Criar sala e gerar código'}
        </button>
      </div>
    </div>
  )
}
