import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { RankItem, OPT_COLORS, OPT_SHAPES, LABELS } from '../components/UI'
import toast from 'react-hot-toast'

function getJoinLink(roomId) {
  return `${location.origin}${location.pathname}#/join/${roomId}`
}

export default function AdminControl() {
  const { roomId } = useParams()
  const navigate   = useNavigate()

  const [room,      setRoom]      = useState(null)
  const [items,     setItems]     = useState([]) // questions + slides
  const [players,   setPlayers]   = useState([])
  const [answers,   setAnswers]   = useState([])
  const [timer,     setTimer]     = useState(0)
  const [qOpen,     setQOpen]     = useState(false)
  const [pauseTimer, setPauseTimer] = useState(3)
  const [slideTimer, setSlideTimer] = useState(0) // for auto-advance slides

  const timerRef      = useRef(null)
  const qrDoneRef     = useRef(false)
  const autoRef       = useRef(null)
  const pauseTimerRef = useRef(null)
  const slideTimerRef = useRef(null)
  const lastIdxRef    = useRef(-1)
  const advancedRef   = useRef(false)

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'rooms', roomId), s => setRoom({ id: s.id, ...s.data() }))
    const u2 = onSnapshot(query(collection(db, 'questions'), where('roomId', '==', roomId)),
      s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))))
    const u3 = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)),
      s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0))))
    const u4 = onSnapshot(query(collection(db, 'answers'), where('roomId', '==', roomId)),
      s => setAnswers(s.docs.map(d => d.data())))
    return () => { u1(); u2(); u3(); u4() }
  }, [roomId])

  // ── QR code ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || room.status !== 'waiting' || qrDoneRef.current) return
    const t = setTimeout(() => {
      const canvas = document.getElementById('qr-canvas')
      if (canvas) {
        qrDoneRef.current = true
        QRCode.toCanvas(canvas, getJoinLink(roomId), { width: 180, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } })
      }
    }, 100)
    return () => clearTimeout(t)
  }, [room?.status])

  const curIdx = room?.currentQuestion ?? 0
  const curItem = items[curIdx]
  const isQuestion = curItem?.type === 'question'
  const isSlide = curItem?.type === 'slide'

  // ── Timer for QUESTIONS only ───────────────────────────────────────────────
  useEffect(() => {
    if (!room || room.status !== 'playing' || !items.length || !isQuestion) {
      clearInterval(timerRef.current)
      return
    }
    if (lastIdxRef.current === curIdx) return
    lastIdxRef.current = curIdx
    advancedRef.current = false

    setTimer(curItem.tempo || 30)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [curIdx, room?.status, items.length, isQuestion])

  // ── Auto-advance when ALL answered (questions only) ────────────────────────
  useEffect(() => {
    if (!room?.autoAdvance || room.status !== 'playing' || !isQuestion) return
    if (!players.length || !items.length) return
    
    const answeredCount = answers.filter(a => a.questionId === curItem.id).length
    if (answeredCount < players.length) return
    if (advancedRef.current) return
    advancedRef.current = true

    const t = setTimeout(() => {
      if (room.showExplain && curItem.explicacao) {
        // Show explanation inline (no phase change, just display it)
        // We'll handle this in the UI by checking if all answered + has explanation
      } else {
        // Auto-advance with 3s timer
        setPauseTimer(3)
        clearInterval(pauseTimerRef.current)
        pauseTimerRef.current = setInterval(() => {
          setPauseTimer(t => {
            if (t <= 1) {
              clearInterval(pauseTimerRef.current)
              advanceToNext()
              return 0
            }
            return t - 1
          })
        }, 1000)
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [answers.length, room?.autoAdvance, curIdx, players.length, isQuestion])

  // ── Auto-advance for SLIDES with duracao > 0 ───────────────────────────────
  useEffect(() => {
    clearInterval(slideTimerRef.current)
    if (!room || room.status !== 'playing' || !isSlide || !curItem.duracao) return
    
    setSlideTimer(curItem.duracao)
    slideTimerRef.current = setInterval(() => {
      setSlideTimer(t => {
        if (t <= 1) {
          clearInterval(slideTimerRef.current)
          advanceToNext()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(slideTimerRef.current)
  }, [curIdx, room?.status, isSlide, curItem?.duracao])

  // ── Auto-mode timer ────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(autoRef.current)
    if (!room?.autoMode || room.status !== 'playing' || !items.length || !isQuestion) return
    
    const totalMs = ((curItem.tempo || 30) + (room.autoInterval || 5)) * 1000
    autoRef.current = setTimeout(() => {
      if (!advancedRef.current) {
        advancedRef.current = true
        advanceToNext()
      }
    }, totalMs)
    return () => clearTimeout(autoRef.current)
  }, [curIdx, room?.status, room?.autoMode, items.length, isQuestion])

  useEffect(() => () => { 
    clearInterval(timerRef.current)
    clearTimeout(autoRef.current)
    clearInterval(pauseTimerRef.current)
    clearInterval(slideTimerRef.current)
  }, [])

  const advanceToNext = () => {
    clearInterval(pauseTimerRef.current)
    clearInterval(slideTimerRef.current)
    if (curIdx < items.length - 1) {
      updateDoc(doc(db, 'rooms', roomId), { currentQuestion: curIdx + 1 })
    } else {
      updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })
        .then(() => navigate(`/room/${roomId}/podium`))
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!room) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  const lightBg = 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)'
  const gameBg  = 'linear-gradient(160deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)'
  const slideBg = 'linear-gradient(160deg,#0f172a,#1e293b)'

  // ── WAITING ────────────────────────────────────────────────────────────────
  if (room.status === 'waiting') return (
    <div style={{ minHeight: '100vh', background: lightBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => { localStorage.setItem('ql_edit_room', roomId); navigate('/admin') }} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>✏️ Editar</button>
          <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12, border: '1.5px solid #fbbf24' }}>⏳ Aguardando</span>
        </div>
      </div>

      <div className="screen" style={{ maxWidth: 600 }}>
        <div className="card" style={{ textAlign: 'center', border: '2px solid rgba(139,92,246,.3)', boxShadow: '0 4px 0 rgba(139,92,246,.15)' }}>
          <div className="card-title">🔗 Compartilhe para entrar</div>
          <div style={{ background: '#f5f3ff', borderRadius: 12, padding: '14px 28px', display: 'inline-block', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#8b5cf6', marginBottom: 4 }}>PIN do jogo</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 44, color: '#4c1d95', letterSpacing: 6 }}>{roomId}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className="qr-wrap"><canvas id="qr-canvas" width="180" height="180" /></div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, wordBreak: 'break-all', fontWeight: 600 }}>{getJoinLink(roomId)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(getJoinLink(roomId)); toast.success('Link copiado!') }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📋 Link</button>
            <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('PIN copiado!') }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>🔑 PIN</button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>👥 Participantes</div>
            <span className="badge badge-purple">{players.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 36 }}>
            {players.length === 0
              ? <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 700 }}>Aguardando jogadores…</span>
              : players.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f3ff', borderRadius: 99, padding: '5px 12px', fontSize: 13, fontWeight: 800, color: '#4c1d95', animation: 'scaleIn .2s ease' }}>
                  <span>{p.avatar}</span><span>{p.nome}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button onClick={() => setQOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>
                📋 {items.length} itens ({items.filter(i => i.type === 'question').length} ❓ + {items.filter(i => i.type === 'slide').length} 🖼)
              </span>
            </div>
            <span style={{ color: '#8b5cf6', fontSize: 18, fontWeight: 700 }}>{qOpen ? '▲' : '▼'}</span>
          </button>
          {qOpen && (
            <div style={{ borderTop: '2px solid #dde3ff', padding: '12px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: item.type === 'question' ? '#f5f3ff' : '#eff6ff', borderRadius: 8 }}>
                    <span style={{ fontFamily: "'Fredoka One',cursive", color: item.type === 'question' ? '#8b5cf6' : '#3b82f6', fontSize: 12, minWidth: 24, paddingTop: 1 }}>#{i+1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.type === 'question' ? (
                        <>
                          <div style={{ fontWeight: 700, color: '#1e1b4b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 13 }}>
                            ❓ {item.pergunta}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 2 }}>
                            {item.pontuacao}pts · {item.tempo}s · <span style={{ color: '#10b981' }}>✓ {LABELS[item.correta]}</span>
                            {item.explicacao && <span style={{ color: '#8b5cf6' }}> · 💬</span>}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 13 }}>🖼 {item.titulo || 'Slide'}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 2 }}>
                            {item.duracao === 0 ? 'Manual' : `Auto ${item.duracao}s`}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'playing', currentQuestion: 0 })}
          disabled={players.length === 0}
          className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {players.length === 0 ? '⏳ Aguardando jogadores…' : `🚀 Iniciar (${players.length} jogador${players.length !== 1 ? 'es' : ''})`}
        </button>
      </div>
    </div>
  )

  // ── PLAYING - SLIDE ────────────────────────────────────────────────────────
  if (room.status === 'playing' && isSlide) return (
    <div style={{ minHeight: '100vh', background: slideBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,.25)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#fff' }}>OL Quiz! ⚡</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>🖼 Slide</span>
          {curItem.duracao > 0 && slideTimer > 0 && (
            <span style={{ background: '#fbbf24', color: '#1e1b4b', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>
              {slideTimer}s
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{curIdx+1}/{items.length}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {curItem.titulo && (
          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: '#fff', marginBottom: 20, textAlign: 'center' }}>
            {curItem.titulo}
          </h2>
        )}
        {curItem.imagem && (
          <img 
            src={curItem.imagem} 
            alt={curItem.titulo || 'Slide'}
            style={{ maxWidth: '90%', maxHeight: '70vh', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => { clearInterval(slideTimerRef.current); advanceToNext() }}
            className="btn btn-primary" style={{ fontSize: 17, padding: '15px 32px' }}>
            {curIdx < items.length - 1 ? 'Próximo →' : '🏁 Encerrar'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── PLAYING - QUESTION ─────────────────────────────────────────────────────
  if (room.status === 'playing' && isQuestion) {
    const answeredForQ = answers.filter(a => a.questionId === curItem.id)
    const pct          = players.length ? Math.round(answeredForQ.length / players.length * 100) : 0
    const timerWarn    = timer <= 5 && timer > 0
    const timerPct     = (timer / (curItem.tempo || 30)) * 100
    const optStats     = (curItem.opcoes || []).map((_, i) => answeredForQ.filter(a => a.resposta === i).length)
    const maxStat      = Math.max(...optStats, 1)
    const allAnswered  = players.length > 0 && answeredForQ.length >= players.length
    const showExplanation = allAnswered && room.showExplain && curItem.explicacao

    return (
      <div style={{ minHeight: '100vh', background: gameBg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'rgba(0,0,0,.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#fff' }}>OL Quiz! ⚡</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {allAnswered && pauseTimer > 0 && !showExplanation && (
              <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
                Próximo em {pauseTimer}s
              </span>
            )}
            {allAnswered && <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>✅ Todos</span>}
            <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>🔴 Ao vivo</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{curIdx+1}/{items.length}</span>
        </div>

        <div className="progress-wrap">
          <div className="progress-fill" style={{ width: `${((curIdx+1)/items.length)*100}%` }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 6px' }}>
          <div className={`timer-circle ${timerWarn ? 'warn' : ''}`} style={{ width: 56, height: 56, fontSize: 22 }}>{timer}</div>
          <div className="timer-bar-wrap" style={{ flex: 1 }}>
            <div className={`timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        <div style={{ padding: '0 12px 10px' }}>
          <div className="q-card">
            {curItem.imagem && <img src={curItem.imagem} alt="" onError={e => { e.target.style.display = 'none' }} />}
            <div className="q-text">{curItem.pergunta}</div>
          </div>
        </div>

        <div style={{ padding: '0 12px 10px' }}>
          <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, marginBottom: 6 }}>
              {curItem.opcoes.map((_, i) => {
                const cnt = optStats[i] || 0
                const h   = Math.max(6, Math.round((cnt / maxStat) * 60))
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{cnt}</span>
                    <div style={{ width: '100%', height: h, background: OPT_COLORS[i], borderRadius: '4px 4px 0 0', transition: 'height .5s', minHeight: 6 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {curItem.opcoes.map((opt, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 14, color: i === curItem.correta ? '#4ade80' : 'rgba(255,255,255,.7)' }}>{OPT_SHAPES[i]}</span>
                  <div style={{ fontSize: 10, color: i === curItem.correta ? '#4ade80' : 'rgba(255,255,255,.5)', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {i === curItem.correta ? '✓ ' : ''}{(opt||'').slice(0,10)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showExplanation && (
          <div style={{ padding: '0 12px 10px' }}>
            <div style={{ background: 'rgba(139,92,246,.15)', border: '2px solid rgba(139,92,246,.35)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#a78bfa', marginBottom: 6 }}>💬 Explicação</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>{curItem.explicacao}</div>
            </div>
          </div>
        )}

        <div style={{ padding: '0 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: allAnswered ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.1)', border: `2px solid ${allAnswered ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.15)'}`, borderRadius: 12, padding: '10px 14px', transition: 'all .3s' }}>
            <span style={{ fontSize: 18 }}>✍️</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 700 }}>Respostas</span>
                <span style={{ fontFamily: "'Fredoka One',cursive", color: '#fbbf24' }}>{answeredForQ.length} / {players.length}</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: allAnswered ? '#22c55e' : '#fbbf24', borderRadius: 99, transition: 'width .4s, background .3s' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => { clearInterval(pauseTimerRef.current); advanceToNext() }} className="btn btn-white" style={{ fontSize: 16 }}>
            {curIdx < items.length - 1 ? 'Próximo →' : '🏁 Encerrar'}
          </button>
          <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })} className="btn btn-danger btn-sm">⏹ Encerrar agora</button>
        </div>

        <div style={{ padding: '0 12px 28px' }}>
          <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>📊 Ranking</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.slice(0,5).map((p,i) => <RankItem key={p.id} rank={i+1} player={p} delay={i*50} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── FINISHED ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: lightBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🏁</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: '#1e1b4b' }}>Apresentação encerrada!</h2>
        <p style={{ color: '#6b7280', fontWeight: 700 }}>{players.length} participantes · {items.filter(i => i.type === 'question').length} perguntas</p>
      </div>
      <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary" style={{ maxWidth: 340, fontSize: 17 }}>🏆 Ver pódio</button>
      <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary" style={{ maxWidth: 340 }}>📊 Ranking completo</button>
      <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ maxWidth: 340 }}>+ Criar nova sala</button>
    </div>
  )
}
