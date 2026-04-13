import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useStore } from '../store'
import { TopBar, Logo, Badge } from '../components/UI'
import toast from 'react-hot-toast'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const OPT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
const DEFAULT_Q = {
  type: 'multiple', // 'multiple' | 'truefalse'
  pergunta: '',
  opcoes: ['', '', '', ''],
  correta: 0,
  pontuacao: 100,
  tempo: 30,
  imagem: '',
}

function QuestionForm({ onSave, onCancel, initial }) {
  const [q, setQ] = useState(initial || { ...DEFAULT_Q, opcoes: ['', '', '', ''] })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const user = useStore(s => s.user)

  const setField = (k, v) => setQ(prev => ({ ...prev, [k]: v }))
  const setOpt = (i, v) => setQ(prev => {
    const opcoes = [...prev.opcoes]
    opcoes[i] = v
    return { ...prev, opcoes }
  })

  const setType = (type) => {
    if (type === 'truefalse') setQ(prev => ({ ...prev, type, opcoes: ['Verdadeiro', 'Falso'], correta: 0 }))
    else setQ(prev => ({ ...prev, type, opcoes: ['', '', '', ''], correta: 0 }))
  }

  const addOpt = () => {
    if (q.opcoes.length >= 6) return
    setQ(prev => ({ ...prev, opcoes: [...prev.opcoes, ''] }))
  }

  const removeOpt = (i) => {
    if (q.opcoes.length <= 2) return
    setQ(prev => {
      const opcoes = prev.opcoes.filter((_, j) => j !== i)
      const correta = prev.correta >= opcoes.length ? 0 : prev.correta === i ? 0 : prev.correta > i ? prev.correta - 1 : prev.correta
      return { ...prev, opcoes, correta }
    })
  }

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx 5MB)'); return }
    setUploading(true)
    try {
      const path = `questions/${user?.uid || 'anon'}/${Date.now()}_${file.name}`
      const r = ref(storage, path)
      await uploadBytes(r, file)
      const url = await getDownloadURL(r)
      setField('imagem', url)
      toast.success('Imagem enviada!')
    } catch (e) {
      toast.error('Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    if (!q.pergunta.trim()) return toast.error('Digite o enunciado')
    const filled = q.opcoes.filter(o => o.trim())
    if (filled.length < 2) return toast.error('Adicione ao menos 2 opções')
    if (!q.opcoes[q.correta]?.trim()) return toast.error('Marque uma opção correta')
    onSave({ ...q, opcoes: q.opcoes.map(o => o.trim()) })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Type selector */}
      <div className="flex gap-2">
        {[['multiple', '🔢 Múltipla escolha'], ['truefalse', '✔ Verdadeiro/Falso']].map(([t, label]) => (
          <button key={t} onClick={() => setType(t)}
            className={`btn flex-1 text-sm py-2 ${q.type === t ? 'btn-primary' : 'btn-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Question text */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">Enunciado</label>
        <textarea
          value={q.pergunta}
          onChange={e => setField('pergunta', e.target.value)}
          placeholder="Digite a pergunta aqui…"
          rows={2}
          className="input-field resize-none"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">Imagem (opcional)</label>
        <div className="flex gap-2 items-center">
          <input type="text" value={q.imagem} onChange={e => setField('imagem', e.target.value)}
            placeholder="URL da imagem ou faça upload…" className="input-field flex-1 text-sm" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn btn-secondary text-sm py-2 px-3 whitespace-nowrap" style={{ width: 'auto' }}>
            {uploading ? '⏳' : '📎 Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </div>
        {q.imagem && (
          <div className="mt-2 relative">
            <img src={q.imagem} alt="preview" className="w-full h-28 object-cover rounded-xl" />
            <button onClick={() => setField('imagem', '')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">×</button>
          </div>
        )}
      </div>

      {/* Options */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">
          Opções <span style={{ color: 'var(--muted)', fontSize: '10px' }}>(marque o ✓ na correta)</span>
        </label>
        <div className="flex flex-col gap-2">
          {q.opcoes.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <button
                onClick={() => setField('correta', i)}
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  background: q.correta === i ? OPT_COLORS[i] : 'var(--surface3)',
                  color: q.correta === i ? '#fff' : OPT_COLORS[i],
                  border: `2px solid ${OPT_COLORS[i]}`,
                }}>
                {LABELS[i]}
              </button>
              <input
                value={opt}
                onChange={e => setOpt(i, e.target.value)}
                placeholder={`Opção ${LABELS[i]}…`}
                className="input-field flex-1 text-sm"
                disabled={q.type === 'truefalse'}
              />
              {q.type !== 'truefalse' && q.opcoes.length > 2 && (
                <button onClick={() => removeOpt(i)} className="text-[--muted] hover:text-red-400 transition-colors text-lg px-1">×</button>
              )}
            </div>
          ))}
        </div>
        {q.type !== 'truefalse' && q.opcoes.length < 6 && (
          <button onClick={addOpt} className="mt-2 text-sm text-[--accent] hover:text-violet-300 transition-colors">
            + Adicionar opção
          </button>
        )}
      </div>

      {/* Points & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">Pontuação</label>
          <select value={q.pontuacao} onChange={e => setField('pontuacao', Number(e.target.value))} className="input-field text-sm">
            {[50, 100, 150, 200, 300, 500, 1000].map(v => <option key={v} value={v}>{v} pts</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">Tempo</label>
          <select value={q.tempo} onChange={e => setField('tempo', Number(e.target.value))} className="input-field text-sm">
            {[10, 15, 20, 30, 45, 60, 90].map(v => <option key={v} value={v}>{v}s</option>)}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="btn btn-success flex-1">
          ✓ {initial ? 'Salvar alterações' : 'Adicionar pergunta'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="btn btn-secondary" style={{ width: 'auto', padding: '12px 16px' }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminCreate() {
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const [roomName, setRoomName] = useState('')
  const [questions, setQuestions] = useState([])
  const [adding, setAdding] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [creating, setCreating] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [autoInterval, setAutoInterval] = useState(5)
  const fileRef = useRef()

  const addQuestion = (q) => {
    setQuestions(prev => [...prev, q])
    setAdding(false)
    toast.success('Pergunta adicionada!')
  }

  const saveEdit = (q) => {
    setQuestions(prev => prev.map((old, i) => i === editIdx ? q : old))
    setEditIdx(null)
    toast.success('Pergunta atualizada!')
  }

  const deleteQ = (i) => {
    setQuestions(prev => prev.filter((_, j) => j !== i))
    toast('Pergunta removida')
  }

  const moveQ = (i, dir) => {
    setQuestions(prev => {
      const arr = [...prev]
      const j = i + dir
      if (j < 0 || j >= arr.length) return arr
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  // Export/Import JSON
  const exportJSON = () => {
    const data = { nome: roomName, perguntas: questions }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `quizlive-${roomName || 'quiz'}.json`
    a.click()
    toast.success('Quiz exportado!')
  }

  const importJSON = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.nome) setRoomName(data.nome)
        if (Array.isArray(data.perguntas)) {
          setQuestions(data.perguntas)
          toast.success(`${data.perguntas.length} perguntas importadas!`)
        }
      } catch { toast.error('Arquivo inválido') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const createRoom = async () => {
    if (!roomName.trim()) return toast.error('Digite o nome da sala')
    if (questions.length === 0) return toast.error('Adicione ao menos uma pergunta')
    setCreating(true)
    try {
      const roomRef = await addDoc(collection(db, 'rooms'), {
        nome: roomName,
        status: 'waiting',
        currentQuestion: 0,
        adminUid: user?.uid || '',
        criadoEm: serverTimestamp(),
        totalQuestions: questions.length,
        autoMode,
        autoInterval,
        savedAt: Date.now(),
      })
      const roomId = roomRef.id

      // Save to history
      const history = JSON.parse(localStorage.getItem('ql_history') || '[]')
      history.unshift({ roomId, nome: roomName, criadoEm: Date.now(), totalQuestions: questions.length })
      localStorage.setItem('ql_history', JSON.stringify(history.slice(0, 20)))

      for (let i = 0; i < questions.length; i++) {
        await addDoc(collection(db, 'questions'), { ...questions[i], roomId, ordem: i })
      }
      navigate(`/room/${roomId}/control`)
    } catch (e) {
      toast.error('Erro ao criar sala: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar
        left={<Logo size="sm" />}
        right={
          <button onClick={() => navigate('/')} className="btn btn-secondary text-sm py-2 px-3" style={{ width: 'auto' }}>
            ← Voltar
          </button>
        }
      />

      <div className="screen wide">
        {/* Room settings */}
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">⚙️ Configurar sala</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[--muted] mb-2">Nome da sala</label>
              <input value={roomName} onChange={e => setRoomName(e.target.value)}
                placeholder="Ex: Trivia de Ciências — Turma B"
                className="input-field" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)}
                  className="w-4 h-4 accent-violet-500" />
                <span className="text-sm font-medium">Modo automático</span>
                <span className="text-xs text-[--muted]">(avança perguntas sozinho)</span>
              </label>
            </div>
            {autoMode && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-[--muted]">Intervalo entre perguntas:</label>
                <select value={autoInterval} onChange={e => setAutoInterval(Number(e.target.value))}
                  className="input-field text-sm" style={{ width: 'auto' }}>
                  {[3, 5, 8, 10, 15, 20].map(v => <option key={v} value={v}>{v}s</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Import/Export */}
        <div className="flex gap-2">
          <button onClick={exportJSON} className="btn btn-secondary flex-1 text-sm py-2" disabled={questions.length === 0}>
            📤 Exportar JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn btn-secondary flex-1 text-sm py-2">
            📥 Importar JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>

        {/* Questions list */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-[--muted]">
              📋 Perguntas
            </div>
            <Badge variant="purple">{questions.length}</Badge>
          </div>

          {questions.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                editIdx === i ? (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface3)', border: '1px solid var(--accent)' }}>
                    <QuestionForm initial={q} onSave={saveEdit} onCancel={() => setEditIdx(null)} />
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl animate-fade-in"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <span className="font-display font-bold text-xs mt-1" style={{ color: 'var(--accent)' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug line-clamp-2">{q.pergunta}</div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-[--muted]">{q.pontuacao}pts</span>
                        <span className="text-xs text-[--muted]">·</span>
                        <span className="text-xs text-[--muted]">{q.tempo}s</span>
                        <span className="text-xs text-[--muted]">·</span>
                        <span className="text-xs" style={{ color: 'var(--green)' }}>
                          ✓ {LABELS[q.correta]}: {q.opcoes[q.correta]?.slice(0, 20)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => moveQ(i, -1)} disabled={i === 0}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs text-[--muted] hover:text-white hover:bg-[--surface3] transition-all disabled:opacity-30">↑</button>
                      <button onClick={() => moveQ(i, 1)} disabled={i === questions.length - 1}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs text-[--muted] hover:text-white hover:bg-[--surface3] transition-all disabled:opacity-30">↓</button>
                      <button onClick={() => setEditIdx(i)}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs hover:bg-[--surface3] transition-all">✏️</button>
                      <button onClick={() => deleteQ(i)}
                        className="w-7 h-7 rounded flex items-center justify-center text-xs hover:bg-red-500/20 transition-all">🗑</button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Add question form */}
          {adding ? (
            <div className="p-4 rounded-xl" style={{ background: 'var(--surface3)', border: '1px solid var(--accent)' }}>
              <div className="font-display font-bold text-sm mb-3" style={{ color: 'var(--accent)' }}>✨ Nova pergunta</div>
              <QuestionForm onSave={addQuestion} onCancel={() => setAdding(false)} />
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="btn btn-secondary w-full text-sm py-3" style={{ borderStyle: 'dashed' }}>
              + Adicionar pergunta
            </button>
          )}
        </div>

        {/* Create button */}
        <button onClick={createRoom} disabled={creating || questions.length === 0 || !roomName.trim()}
          className="btn btn-primary w-full py-4 text-base font-bold">
          {creating ? (
            <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Criando…</>
          ) : (
            <><span className="text-xl">🚀</span> Criar sala e gerar QR Code</>
          )}
        </button>
      </div>
    </div>
  )
}
