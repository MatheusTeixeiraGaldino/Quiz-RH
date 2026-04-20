import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { RankItem, OPT_COLORS, OPT_SHAPES, LABELS } from '../components/UI'
import toast from 'react-hot-toast'

// room.phase values:
//   undefined / 'question'    → showing question
//   'explanation'             → showing explanation (admin controls when to advance)
//   'pause'                   → showing pause image (admin controls when to advance)

function getJoinLink(roomId) {
  return `${location.origin}${location.pathname}#/join/${roomId}`
}

export default function AdminControl() {
  const { roomId } = useParams()
  const navigate   = useNavigate()

  const [room,      setRoom]      = useState(null)
  const [questions, setQuestions] = useState([])
  const [players,   setPlayers]   = useState([])
  const [answers,   setAnswers]   = useState([])
  const [timer,     setTimer]     = useState(0)
  const [qOpen,     setQOpen]     = useState(false)
  const [pauseTimer, setPauseTimer] = useState(3) // countdown 3s before auto-advance

  const timerRef      = useRef(null)
  const qrDoneRef     = useRef(false)
  const autoRef       = useRef(null)
  const pauseTimerRef = useRef(null)
  const lastQRef      = useRef(-1)
  const advancedRef   = useRef(false)

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'rooms', roomId), s => setRoom({ id: s.id, ...s.data() }))
    const u2 = onSnapshot(query(collection(db, 'questions'), where('roomId', '==', roomId)),
      s => setQuestions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))))
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

  // ── Timer (only runs during 'question' phase) ──────────────────────────────
  useEffect(() => {
    const isQuestion = !room?.phase || room.phase === 'question'
    if (!room || room.status !== 'playing' || !questions.length || !isQuestion) {
      clearInterval(timerRef.current)
      return
    }
    const cqIdx = room.currentQuestion ?? 0
    const cq    = questions[cqIdx]
    if (!cq) return
    if (lastQRef.current === cqIdx && room.phase === 'question') return
    lastQRef.current  = cqIdx
    advancedRef.current = false

    setTimer(cq.tempo || 30)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.currentQuestion, room?.status, room?.phase, questions.length])

  // ── Auto-advance when ALL players answered ─────────────────────────────────
  // Logic: if all answered → check if has explanation OR pause → go to that phase OR auto-advance after 3s
  useEffect(() => {
    if (!room?.autoAdvance || room.status !== 'playing') return
    if (!players.length || !questions.length) return
    if (room.phase === 'explanation' || room.phase === 'pause') return
    const cqIdx  = room.currentQuestion ?? 0
    const curQ   = questions[cqIdx]
    if (!curQ) return

    const answeredCount = answers.filter(a => a.questionId === curQ.id).length
    if (answeredCount < players.length) return
    if (advancedRef.current) return
    advancedRef.current = true

    const t = setTimeout(() => {
      if (room.showExplain && curQ.explicacao) {
        // Has explanation → go to explanation phase (manual advance)
        updateDoc(doc(db, 'rooms', roomId), { phase: 'explanation' })
      } else if (curQ.pauseImage) {
        // Has pause image → go to pause phase (manual advance)
        updateDoc(doc(db, 'rooms', roomId), { phase: 'pause' })
      } else {
        // No explanation, no pause → auto-advance with 3s timer
        setPauseTimer(3)
        clearInterval(pauseTimerRef.current)
        pauseTimerRef.current = setInterval(() => {
          setPauseTimer(t => {
            if (t <= 1) {
              clearInterval(pauseTimerRef.current)
              advanceToNext(cqIdx)
              return 0
            }
            return t - 1
          })
        }, 1000)
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [answers.length, room?.autoAdvance, room?.currentQuestion, room?.phase, players.length])

  // ── Auto-mode timer-based ──────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(autoRef.current)
    if (!room?.autoMode || room.status !== 'playing' || !questions.length) return
    if (room.phase === 'explanation' || room.phase === 'pause') return
    const cqIdx = room.currentQuestion ?? 0
    const cq    = questions[cqIdx]
    if (!cq) return
    const totalMs = ((cq.tempo || 30) + (room.autoInterval || 5)) * 1000
    autoRef.current = setTimeout(() => {
      if (!advancedRef.current) {
        advancedRef.current = true
        if (room.showExplain && cq.explicacao) {
          updateDoc(doc(db, 'rooms', roomId), { phase: 'explanation' })
        } else if (cq.pauseImage) {
          updateDoc(doc(db, 'rooms', roomId), { phase: 'pause' })
        } else {
          advanceToNext(cqIdx)
        }
      }
    }, totalMs)
    return () => clearTimeout(autoRef.current)
  }, [room?.currentQuestion, room?.status, room?.phase, room?.autoMode, questions.length])

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(autoRef.current); clearInterval(pauseTimerRef.current) }, [])

  const advanceToNext = (cqIdx) => {
    clearInterval(pauseTimerRef.current)
    if ((cqIdx ?? 0) < questions.length - 1) {
      updateDoc(doc(db, 'rooms', roomId), { currentQuestion: (cqIdx ?? 0) + 1, phase: 'question' })
    } else {
      updateDoc(doc(db, 'rooms', roomId), { status: 'finished', phase: 'question' })
        .then(() => navigate(`/room/${roomId}/podium`))
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!room) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  const cqIdx        = room.currentQuestion ?? 0
  const curQ         = questions[cqIdx]
  const answeredForQ = answers.filter(a => a.questionId === curQ?.id)
  const pct          = players.length ? Math.round(answeredForQ.length / players.length * 100) : 0
  const timerWarn    = timer <= 5 && timer > 0
  const timerPct     = curQ ? (timer / (curQ.tempo || 30)) * 100 : 0
  const optStats     = (curQ?.opcoes || []).map((_, i) => answeredForQ.filter(a => a.resposta === i).length)
  const maxStat      = Math.max(...optStats, 1)
  const allAnswered  = players.length > 0 && answeredForQ.length >= players.length
  const isExplanation = room.phase === 'explanation'
  const isPause       = room.phase === 'pause'

  const lightBg = 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)'
  const gameBg  = 'linear-gradient(160deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)'
  const explBg  = 'linear-gradient(160deg,#1e1b4b,#312e81)'
  const pauseBg = 'linear-gradient(160deg,#0f172a,#1e293b)'

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
            <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('PIN copiado!') }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>🔑 PIN: {roomId}</button>
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
          <button
            onClick={() => setQOpen(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' }}>
                📋 {questions.length} pergunta{questions.length !== 1 ? 's' : ''}
              </span>
              {room.showExplain && <span className="badge badge-purple" style={{ fontSize: 10 }}>💬 explicação</span>}
              {room.autoAdvance && <span className="badge badge-green" style={{ fontSize: 10 }}>⚡ auto-avanço</span>}
            </div>
            <span style={{ color: '#8b5cf6', fontSize: 18, fontWeight: 700 }}>{qOpen ? '▲' : '▼'}</span>
          </button>
          {qOpen && (
            <div style={{ borderTop: '2px solid #dde3ff', padding: '12px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: '#f5f3ff', borderRadius: 8 }}>
                    <span style={{ fontFamily: "'Fredoka One',cursive", color: '#8b5cf6', fontSize: 12, minWidth: 24, paddingTop: 1 }}>#{i+1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1e1b4b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 13 }}>{q.pergunta}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 2 }}>
                        {q.pontuacao}pts · {q.tempo}s · <span style={{ color: '#10b981' }}>✓ {LABELS[q.correta]}</span>
                        {q.explicacao && <span style={{ color: '#8b5cf6' }}> · 💬</span>}
                        {q.pauseImage && <span style={{ color: '#f59e0b' }}> · ⏸</span>}
                      </div>
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: 10, flexShrink: 0 }}>{q.pontuacao}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'playing', currentQuestion: 0, phase: 'question' })}
          disabled={players.length === 0}
          className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {players.length === 0 ? '⏳ Aguardando jogadores…' : `🚀 Iniciar (${players.length} jogador${players.length !== 1 ? 'es' : ''})`}
        </button>
      </div>
    </div>
  )

  // ── PAUSE PHASE (showing pause image) ──────────────────────────────────────
  if (room.status === 'playing' && isPause && curQ) return (
    <div style={{ minHeight: '100vh', background: pauseBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,.25)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#fff' }}>OL Quiz! ⚡</span>
        <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>⏸ Pausa</span>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{cqIdx+1}/{questions.length}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {curQ.pauseImage && (
          <img 
            src={curQ.pauseImage} 
            alt="Pausa"
            style={{ maxWidth: '90%', maxHeight: '70vh', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 700, marginBottom: 16 }}>
            Clique para continuar
          </div>
          <button
            onClick={() => { advancedRef.current = true; advanceToNext(cqIdx) }}
            className="btn btn-primary" style={{ fontSize: 17, padding: '15px 32px' }}>
            {cqIdx < questions.length - 1 ? 'Próxima pergunta →' : '🏁 Encerrar quiz'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── EXPLANATION PHASE ──────────────────────────────────────────────────────
  if (room.status === 'playing' && isExplanation && curQ) return (
    <div style={{ minHeight: '100vh', background: explBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,.25)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#fff' }}>OL Quiz! ⚡</span>
        <span style={{ background: '#a78bfa', color: '#1e1b4b', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>💬 Explicação</span>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{cqIdx+1}/{questions.length}</span>
      </div>

      <div style={{ flex: 1, padding: '16px 14px', maxWidth: 700, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.15)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Pergunta {cqIdx+1}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 14 }}>{curQ.pergunta}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {curQ.opcoes.map((opt, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 10, border: `2px solid ${i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.15)'}`, background: i === curQ.correta ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.6)' }}>{OPT_SHAPES[i]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.7)' }}>{opt}</span>
                {i === curQ.correta && <span style={{ marginLeft: 'auto', fontSize: 14 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(139,92,246,.15)', border: '2px solid rgba(139,92,246,.35)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#a78bfa', marginBottom: 8 }}>💬 Explicação</div>
          {curQ.explicacao ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.6 }}>{curQ.explicacao}</div>
          ) : (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', fontWeight: 600, fontStyle: 'italic' }}>Sem explicação cadastrada.</div>
          )}
        </div>

        <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>Distribuição</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56, marginBottom: 6 }}>
            {curQ.opcoes.map((_, i) => {
              const cnt = optStats[i] || 0
              const h   = Math.max(4, Math.round((cnt / maxStat) * 48))
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: '#fff' }}>{cnt}</span>
                  <div style={{ width: '100%', height: h, background: i === curQ.correta ? '#4ade80' : OPT_COLORS[i], borderRadius: '3px 3px 0 0', transition: 'height .4s', minHeight: 4 }} />
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={() => { advancedRef.current = true; advanceToNext(cqIdx) }}
          className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {cqIdx < questions.length - 1 ? 'Próxima pergunta →' : '🏁 Encerrar e ver pódio'}
        </button>
        <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })} className="btn btn-danger btn-sm">⏹ Encerrar agora</button>
      </div>
    </div>
  )

  // ── PLAYING (question phase) ───────────────────────────────────────────────
  if (room.status === 'playing' && curQ) return (
    <div style={{ minHeight: '100vh', background: gameBg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: '#fff' }}>OL Quiz! ⚡</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {allAnswered && pauseTimer > 0 && !room.showExplain && !curQ.pauseImage && (
            <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
              Próxima em {pauseTimer}s
            </span>
          )}
          {allAnswered && !pauseTimer && <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>✅ Todos responderam</span>}
          <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>🔴 Ao vivo</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{cqIdx+1}/{questions.length}</span>
      </div>

      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${((cqIdx+1)/questions.length)*100}%` }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 6px' }}>
        <div className={`timer-circle ${timerWarn ? 'warn' : ''}`} style={{ width: 56, height: 56, fontSize: 22 }}>{timer}</div>
        <div className="timer-bar-wrap" style={{ flex: 1 }}>
          <div className={`timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>
      </div>

      <div style={{ padding: '0 12px 10px' }}>
        <div className="q-card">
          {curQ.imagem && <img src={curQ.imagem} alt="" onError={e => { e.target.style.display = 'none' }} />}
          <div className="q-text">{curQ.pergunta}</div>
        </div>
      </div>

      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, marginBottom: 6 }}>
            {curQ.opcoes.map((_, i) => {
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
            {curQ.opcoes.map((opt, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 14, color: i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.7)' }}>{OPT_SHAPES[i]}</span>
                <div style={{ fontSize: 10, color: i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.5)', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {i === curQ.correta ? '✓ ' : ''}{(opt||'').slice(0,10)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
        {room.showExplain && curQ.explicacao ? (
          <button onClick={() => { advancedRef.current = true; updateDoc(doc(db, 'rooms', roomId), { phase: 'explanation' }) }}
            className="btn btn-white" style={{ fontSize: 16 }}>💬 Ver explicação</button>
        ) : curQ.pauseImage ? (
          <button onClick={() => { advancedRef.current = true; updateDoc(doc(db, 'rooms', roomId), { phase: 'pause' }) }}
            className="btn btn-white" style={{ fontSize: 16 }}>⏸ Ver slide</button>
        ) : (
          cqIdx < questions.length - 1
            ? <button onClick={() => { advancedRef.current = true; clearInterval(pauseTimerRef.current); updateDoc(doc(db, 'rooms', roomId), { currentQuestion: cqIdx + 1, phase: 'question' }) }} className="btn btn-white" style={{ fontSize: 16 }}>Próxima pergunta →</button>
            : <button onClick={() => { advancedRef.current = true; updateDoc(doc(db, 'rooms', roomId), { status: 'finished', phase: 'question' }).then(() => navigate(`/room/${roomId}/podium`)) }} className="btn btn-success" style={{ fontSize: 16 }}>🏁 Encerrar</button>
        )}
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

  // ── FINISHED ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: lightBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🏁</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: '#1e1b4b' }}>Jogo encerrado!</h2>
        <p style={{ color: '#6b7280', fontWeight: 700 }}>{players.length} participantes · {questions.length} perguntas</p>
      </div>
      <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary" style={{ maxWidth: 340, fontSize: 17 }}>🏆 Ver pódio</button>
      <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary" style={{ maxWidth: 340 }}>📊 Ranking completo</button>
      <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ maxWidth: 340 }}>+ Criar nova sala</button>
    </div>
  )
}
