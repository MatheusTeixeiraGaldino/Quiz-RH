import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, onSnapshot, query, collection, where,
  setDoc, updateDoc, getDoc, increment, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { OPT_SHAPES, OPT_CLS, LABELS, OPT_COLORS } from '../components/UI'

export default function PlayerGame() {
  const { roomId }   = useParams()
  const navigate     = useNavigate()
  const user         = useStore(s => s.user)
  const soundEnabled = useStore(s => s.soundEnabled)
  const playerId     = user?.uid

  const [room,      setRoom]      = useState(null)
  const [questions, setQuestions] = useState([])
  const [answered,  setAnswered]  = useState({})   // questionId -> idx
  const [myScore,   setMyScore]   = useState(0)
  const [timer,     setTimer]     = useState(30)
  // phase: 'question' | 'feedback' | 'explanation'
  const [phase,     setPhase]     = useState('question')
  const [lastPts,   setLastPts]   = useState(0)
  const [streak,    setStreak]    = useState(0)
  const [explTimer, setExplTimer] = useState(0)

  const timerRef    = useRef(null)
  const explRef     = useRef(null)
  const lastQIdxRef = useRef(-1)
  const roomRef     = useRef(null)
  const questionsRef = useRef([])
  roomRef.current      = room
  questionsRef.current = questions

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    return onSnapshot(doc(db, 'rooms', roomId), s => {
      if (s.exists()) setRoom({ id: s.id, ...s.data() })
    })
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    return onSnapshot(
      query(collection(db, 'questions'), where('roomId', '==', roomId)),
      s => setQuestions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)))
    )
  }, [roomId])

  useEffect(() => {
    if (!roomId || !playerId) return
    return onSnapshot(
      query(collection(db, 'answers'), where('playerId', '==', playerId), where('roomId', '==', roomId)),
      s => {
        let total = 0; const ans = {}
        s.docs.forEach(d => { const da = d.data(); ans[da.questionId] = da.resposta; total += (da.pontosGanhos || 0) })
        setAnswered(ans); setMyScore(total)
      }
    )
  }, [roomId, playerId])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || !questions.length) return
    if (room.status !== 'playing') { clearInterval(timerRef.current); return }
    const cqIdx = room.currentQuestion ?? 0
    const cq    = questions[cqIdx]
    if (!cq) return
    if (lastQIdxRef.current === cqIdx) return
    lastQIdxRef.current = cqIdx

    clearInterval(timerRef.current)
    clearInterval(explRef.current)
    setPhase('question')
    setTimer(cq.tempo || 30)

    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
    return () => { clearInterval(timerRef.current); clearInterval(explRef.current) }
  }, [room?.currentQuestion, room?.status, questions.length])

  // ── Explanation countdown ──────────────────────────────────────────────────
  const startExplTimer = useCallback((duration) => {
    clearInterval(explRef.current)
    setExplTimer(duration)
    explRef.current = setInterval(() => {
      setExplTimer(t => { if (t <= 1) { clearInterval(explRef.current); return 0 } return t - 1 })
    }, 1000)
  }, [])

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(explRef.current) }, [])

  // ── Answer ─────────────────────────────────────────────────────────────────
  const answer = useCallback(async (idx) => {
    const r = roomRef.current; const qs = questionsRef.current
    if (!r || !playerId) return
    const cqIdx = r.currentQuestion ?? 0
    const q = qs[cqIdx]
    if (!q || answered[q.id] !== undefined || timer === 0) return

    const isCorrect = idx === q.correta
    const timeBonus = isCorrect ? Math.max(0, Math.round((timer / (q.tempo || 30)) * q.pontuacao * 0.5)) : 0
    const pts = isCorrect ? q.pontuacao + timeBonus : 0

    setAnswered(prev => ({ ...prev, [q.id]: idx }))
    setLastPts(pts)
    if (isCorrect) setStreak(s => s + 1); else setStreak(0)

    // Show feedback first, then explanation if enabled
    setPhase('feedback')

    if (r.showExplain) {
      // After 2.5s feedback, show explanation
      setTimeout(() => {
        setPhase('explanation')
        startExplTimer(r.explainTime || 8)
      }, 2500)
    }

    // Sound
    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        if (isCorrect) {
          osc.frequency.setValueAtTime(523,ctx.currentTime); osc.frequency.setValueAtTime(659,ctx.currentTime+.1); osc.frequency.setValueAtTime(784,ctx.currentTime+.2)
          gain.gain.setValueAtTime(.3,ctx.currentTime); gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.5)
          osc.start(); osc.stop(ctx.currentTime+.5)
        } else {
          osc.frequency.setValueAtTime(220,ctx.currentTime); osc.frequency.setValueAtTime(160,ctx.currentTime+.2)
          gain.gain.setValueAtTime(.3,ctx.currentTime); gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.4)
          osc.start(); osc.stop(ctx.currentTime+.4)
        }
      } catch(e) {}
    }

    const ansId = `${playerId}_${q.id}`
    try {
      const ex = await getDoc(doc(db, 'answers', ansId))
      if (!ex.exists()) {
        await setDoc(doc(db, 'answers', ansId), { playerId, questionId: q.id, roomId, resposta: idx, correta: isCorrect, pontosGanhos: pts, ts: serverTimestamp() })
        if (pts > 0) await updateDoc(doc(db, 'players', playerId), { score: increment(pts) })
      }
    } catch(e) { console.error(e) }
  }, [answered, timer, playerId, roomId, soundEnabled, startExplTimer])

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!room || questions.length === 0) return (
    <div className="game-bg" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, minHeight:'100vh' }}>
      <div className="spinner" style={{ borderColor:'rgba(255,255,255,.25)', borderTopColor:'#fff', width:44, height:44, borderWidth:4 }} />
      <p style={{ color:'rgba(255,255,255,.7)', fontWeight:700, fontSize:16 }}>Carregando sala…</p>
    </div>
  )

  // ── FINISHED — show per-question summary ────────────────────────────────────
  if (room.status === 'finished') {
    const correct = questions.filter(q => answered[q.id] === q.correta).length
    const wrong   = questions.filter(q => answered[q.id] !== undefined && answered[q.id] !== q.correta).length
    const missed  = questions.filter(q => answered[q.id] === undefined).length

    return (
      <div className="game-bg" style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ background:'rgba(0,0,0,.2)', padding:'14px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:'#fff' }}>OL Quiz! ⚡</div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 32px', maxWidth:500, margin:'0 auto', width:'100%' }}>
          {/* Score card */}
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:56, animation:'bounceIn .6s ease' }}>🏁</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#fff', marginTop:8 }}>Fim de jogo!</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:48, color:'#fbbf24', lineHeight:1, marginTop:4 }}>
              {myScore.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', fontWeight:700, marginTop:2 }}>pontos</div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
            {[['✅', correct, 'Acertos','#22c55e'], ['❌', wrong, 'Erros','#ef4444'], ['⏭', missed, 'Puladas','#6b7280']].map(([icon, val, label, color]) => (
              <div key={label} style={{ background:'rgba(255,255,255,.1)', border:`2px solid ${color}44`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
                <div style={{ fontSize:22 }}>{icon}</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color, lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:700 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Per-question breakdown */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:13, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,.5)', marginBottom:10 }}>
              Resumo por pergunta
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {questions.map((q, i) => {
                const myAns   = answered[q.id]
                const hasAns  = myAns !== undefined
                const isOk    = hasAns && myAns === q.correta
                const bgColor = !hasAns ? 'rgba(107,114,128,.2)' : isOk ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'
                const border  = !hasAns ? 'rgba(107,114,128,.3)' : isOk ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)'
                return (
                  <div key={q.id} style={{ background:bgColor, border:`2px solid ${border}`, borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <div style={{ fontSize:20, flexShrink:0 }}>{!hasAns ? '⏭' : isOk ? '✅' : '❌'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'#fff', lineHeight:1.35, marginBottom:4 }}>
                          <span style={{ fontFamily:"'Fredoka One',cursive", color:'rgba(255,255,255,.5)', marginRight:6, fontSize:12 }}>#{i+1}</span>
                          {q.pergunta}
                        </div>
                        {hasAns && !isOk && (
                          <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', fontWeight:700 }}>
                            Sua resposta: <span style={{ color:'#ef4444' }}>{LABELS[myAns]} — {q.opcoes[myAns]}</span>
                          </div>
                        )}
                        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', fontWeight:700 }}>
                          {isOk ? 'Correto! ' : 'Resposta: '}
                          <span style={{ color:'#4ade80' }}>{LABELS[q.correta]} — {q.opcoes[q.correta]}</span>
                        </div>
                        {q.explicacao && (
                          <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:4, fontWeight:600, fontStyle:'italic' }}>
                            💬 {q.explicacao}
                          </div>
                        )}
                        {hasAns && isOk && (
                          <div style={{ fontSize:11, color:'#fbbf24', fontWeight:800, marginTop:2 }}>
                            +{q.pontuacao} pts (base)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-white" style={{ fontSize:17, marginBottom:8 }}>
            🏆 Ver pódio
          </button>
        </div>
      </div>
    )
  }

  const cqIdx   = room.currentQuestion ?? 0
  const q       = questions[cqIdx]

  if (!q) return (
    <div className="game-bg" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, minHeight:'100vh' }}>
      <div style={{ fontSize:52, animation:'pulse 1.5s infinite' }}>⏳</div>
      <p style={{ color:'rgba(255,255,255,.8)', fontWeight:700, fontSize:18 }}>Aguardando pergunta…</p>
    </div>
  )

  const myAns   = answered[q.id]
  const hasAns  = myAns !== undefined
  const isOk    = hasAns && myAns === q.correta
  const timerWarn = timer <= 5
  const timerPct  = Math.max(0, (timer / (q.tempo || 30)) * 100)

  // ── EXPLANATION PHASE ──────────────────────────────────────────────────────
  if (phase === 'explanation') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1e1b4b,#312e81)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', gap:16 }}>
        <div style={{ fontSize:14, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,.5)' }}>💬 Explicação</div>
        <div style={{ background:'rgba(255,255,255,.08)', border:'2px solid rgba(255,255,255,.15)', borderRadius:16, padding:'20px 18px', maxWidth:440, width:'100%' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:8 }}>Resposta correta:</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:'#4ade80', marginBottom:16 }}>
            {LABELS[q.correta]} — {q.opcoes[q.correta]}
          </div>
          {q.explicacao ? (
            <div style={{ fontSize:16, color:'#fff', fontWeight:700, lineHeight:1.5 }}>{q.explicacao}</div>
          ) : (
            <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', fontWeight:600, fontStyle:'italic' }}>Sem explicação cadastrada</div>
          )}
        </div>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color:'rgba(255,255,255,.5)' }}>
          Próxima em {explTimer}s…
        </div>
        <div className="score-box" style={{ width:200, marginTop:4 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,.5)', marginBottom:2 }}>Total</div>
          <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
        </div>
      </div>
    )
  }

  // ── FEEDBACK PHASE ─────────────────────────────────────────────────────────
  if (phase === 'feedback' && hasAns) {
    return (
      <div style={{ minHeight:'100vh', background: isOk ? 'linear-gradient(160deg,#059669,#047857)' : 'linear-gradient(160deg,#dc2626,#991b1b)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', gap:14 }}>
        <div style={{ fontSize:72, animation:'bounceIn .5s ease' }}>{isOk ? '✅' : '❌'}</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:30, color:'#fff' }}>{isOk ? 'Correto! 🎉' : 'Errou! 😅'}</div>
        {isOk ? (
          <>
            <div style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,.65)' }}>Pontos ganhos</div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:60, color:'#fbbf24', lineHeight:1 }}>+{lastPts.toLocaleString('pt-BR')}</div>
            {streak >= 2 && <div style={{ fontSize:16, fontWeight:800, color:'#fde68a' }}>🔥 {streak} acertos seguidos!</div>}
          </>
        ) : (
          <div style={{ fontSize:15, color:'rgba(255,255,255,.85)', fontWeight:700, maxWidth:320 }}>
            Resposta: <strong style={{ color:'#fbbf24' }}>{LABELS[q.correta]}</strong> — {q.opcoes[q.correta]}
          </div>
        )}
        <div className="score-box" style={{ marginTop:8, width:220 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,.55)', marginBottom:2 }}>Total</div>
          <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
        </div>
        {!room.showExplain && (
          <p style={{ color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, marginTop:4 }}>Aguardando próxima pergunta…</p>
        )}
        {room.showExplain && (
          <p style={{ color:'rgba(255,255,255,.45)', fontSize:13, fontWeight:700, marginTop:4 }}>Carregando explicação…</p>
        )}
      </div>
    )
  }

  // ── QUESTION PHASE ─────────────────────────────────────────────────────────
  return (
    <div className="game-bg" style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      {/* Top bar — NO home button */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(0,0,0,.18)' }}>
        <span style={{ fontWeight:800, fontSize:13, color:'rgba(255,255,255,.65)' }}>{cqIdx+1} / {questions.length}</span>
        <div className={`timer-circle ${timerWarn ? 'warn' : ''}`}>{timer}</div>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:'#fbbf24' }}>{myScore.toLocaleString('pt-BR')} pts</span>
      </div>

      <div className="progress-wrap">
        <div className="progress-fill" style={{ width:`${((cqIdx+1)/questions.length)*100}%` }} />
      </div>

      <div style={{ padding:'8px 14px 4px', display:'flex', alignItems:'center', gap:10 }}>
        <div className="timer-bar-wrap">
          <div className={`timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width:`${timerPct}%` }} />
        </div>
        <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontWeight:700, flexShrink:0 }}>{q.pontuacao} pts</span>
      </div>

      <div style={{ padding:'0 12px 10px' }}>
        <div className="q-card">
          {q.imagem && <img src={q.imagem} alt="pergunta" onError={e => { e.target.style.display='none' }} />}
          <div className="q-text">{q.pergunta}</div>
        </div>
      </div>

      <div style={{ padding:'0 12px', flex:1 }}>
        <div className="opt-grid">
          {q.opcoes.filter(Boolean).map((opt, i) => {
            let extra = ''
            if (hasAns) {
              if (i === q.correta) extra = 'correct'
              else if (i === myAns) extra = 'wrong-my'
              else extra = 'wrong'
            }
            return (
              <button key={i} onClick={() => answer(i)} disabled={hasAns || timer === 0}
                className={`opt-btn ${OPT_CLS[i] || 'opt-1'} ${extra}`}>
                <div className="opt-icon">{OPT_SHAPES[i] || '●'}</div>
                <div className="opt-text">{opt}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding:'10px 14px 24px', textAlign:'center' }}>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:.5, color:'rgba(255,255,255,.45)' }}>Pontuação</div>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:'#fbbf24' }}>{myScore.toLocaleString('pt-BR')}</div>
      </div>
    </div>
  )
}
