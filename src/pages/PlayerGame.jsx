import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, onSnapshot, query, collection, where,
  setDoc, updateDoc, getDoc, increment, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { OPT_SHAPES, OPT_CLS, LABELS } from '../components/UI'

export default function PlayerGame() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const soundEnabled = useStore(s => s.soundEnabled)
  const playerId = user?.uid

  // ── Core state ─────────────────────────────────────────────────────────────
  const [room, setRoom] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answered, setAnswered] = useState({})
  const [myScore, setMyScore] = useState(0)
  const [timer, setTimer] = useState(30)
  const [phase, setPhase] = useState('question') // 'question' | 'feedback'
  const [lastPts, setLastPts] = useState(0)
  const [streak, setStreak] = useState(0)

  // Refs — avoid stale closures
  const timerRef       = useRef(null)
  const lastQIdxRef    = useRef(-1)   // tracks which question timer is running for
  const roomRef        = useRef(null)
  const questionsRef   = useRef([])

  // Keep refs in sync
  roomRef.current      = room
  questionsRef.current = questions

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const unsub = onSnapshot(doc(db, 'rooms', roomId), snap => {
      if (snap.exists()) setRoom({ id: snap.id, ...snap.data() })
    })
    return unsub
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const q = query(
      collection(db, 'questions'),
      where('roomId', '==', roomId)
    )
    const unsub = onSnapshot(q, snap => {
      const qs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      setQuestions(qs)
    })
    return unsub
  }, [roomId])

  useEffect(() => {
    if (!roomId || !playerId) return
    const q = query(
      collection(db, 'answers'),
      where('playerId', '==', playerId),
      where('roomId', '==', roomId)
    )
    const unsub = onSnapshot(q, snap => {
      let total = 0
      const ans = {}
      snap.docs.forEach(d => {
        const da = d.data()
        ans[da.questionId] = da.resposta
        total += (da.pontosGanhos || 0)
      })
      setAnswered(ans)
      setMyScore(total)
    })
    return unsub
  }, [roomId, playerId])

  // ── Timer logic ────────────────────────────────────────────────────────────
  // Only start timer when BOTH room AND questions are loaded and status=playing
  useEffect(() => {
    // Guard: need all data
    if (!room || !questions.length) return
    if (room.status !== 'playing') {
      clearInterval(timerRef.current)
      return
    }

    const cqIdx = room.currentQuestion ?? 0
    const cq = questions[cqIdx]

    // Guard: question must exist in our loaded array
    if (!cq) return

    // Only reset timer when question index actually changed
    if (lastQIdxRef.current === cqIdx) return
    lastQIdxRef.current = cqIdx

    // Reset phase and start fresh timer
    setPhase('question')
    const tempo = cq.tempo || 30
    setTimer(tempo)

    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [room?.currentQuestion, room?.status, questions.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  // ── Answer ─────────────────────────────────────────────────────────────────
  const answer = useCallback(async (idx) => {
    const currentRoom = roomRef.current
    const currentQuestions = questionsRef.current
    if (!currentRoom || !playerId) return

    const cqIdx = currentRoom.currentQuestion ?? 0
    const q = currentQuestions[cqIdx]
    if (!q) return
    if (answered[q.id] !== undefined) return
    if (timer === 0) return

    const isCorrect = idx === q.correta
    const maxTime = q.tempo || 30
    const timeBonus = isCorrect
      ? Math.max(0, Math.round((timer / maxTime) * q.pontuacao * 0.5))
      : 0
    const pts = isCorrect ? q.pontuacao + timeBonus : 0

    // Optimistic UI update
    setAnswered(prev => ({ ...prev, [q.id]: idx }))
    setLastPts(pts)
    if (isCorrect) setStreak(s => s + 1)
    else setStreak(0)
    setPhase('feedback')

    // Sound feedback
    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        if (isCorrect) {
          osc.frequency.setValueAtTime(523, ctx.currentTime)
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
          osc.start(); osc.stop(ctx.currentTime + 0.5)
        } else {
          osc.frequency.setValueAtTime(220, ctx.currentTime)
          osc.frequency.setValueAtTime(160, ctx.currentTime + 0.2)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
          osc.start(); osc.stop(ctx.currentTime + 0.4)
        }
      } catch (e) {}
    }

    // Firestore write (idempotent)
    const ansId = `${playerId}_${q.id}`
    try {
      const existing = await getDoc(doc(db, 'answers', ansId))
      if (!existing.exists()) {
        await setDoc(doc(db, 'answers', ansId), {
          playerId,
          questionId: q.id,
          roomId,
          resposta: idx,
          correta: isCorrect,
          pontosGanhos: pts,
          ts: serverTimestamp(),
        })
        if (pts > 0) {
          await updateDoc(doc(db, 'players', playerId), { score: increment(pts) })
        }
      }
    } catch (e) {
      console.error('Answer write error:', e)
    }
  }, [answered, timer, playerId, roomId, soundEnabled])

  // ── Render guards ──────────────────────────────────────────────────────────

  // Still loading
  if (!room || questions.length === 0) {
    return (
      <div className="game-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.25)', borderTopColor: '#fff', width: 44, height: 44, borderWidth: 4 }} />
        <p style={{ color: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 16 }}>Carregando sala…</p>
      </div>
    )
  }

  // Game finished
  if (room.status === 'finished') {
    return (
      <div className="game-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20, textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 72, animation: 'bounceIn .6s ease' }}>🏁</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: '#fff' }}>Fim de jogo!</h2>
        <p style={{ color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>Veja como você se saiu</p>
        <div className="score-box" style={{ width: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Pontuação final</div>
          <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
        </div>
        <button onClick={() => navigate(`/room/${roomId}/podium`)}
          className="btn btn-white" style={{ maxWidth: 280, fontSize: 17 }}>
          🏆 Ver pódio
        </button>
        <button onClick={() => navigate('/')}
          className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.3)', width: 'auto', padding: '8px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          🏠 Início
        </button>
      </div>
    )
  }

  const cqIdx = room.currentQuestion ?? 0
  const q = questions[cqIdx]

  // Question not yet loaded (race condition)
  if (!q) {
    return (
      <div className="game-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '100vh' }}>
        <div style={{ fontSize: 52, animation: 'pulse 1.5s infinite' }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,.8)', fontWeight: 700, fontSize: 18 }}>Aguardando pergunta…</p>
      </div>
    )
  }

  const myAns   = answered[q.id]
  const hasAns  = myAns !== undefined
  const isOk    = hasAns && myAns === q.correta
  const timerWarn = timer <= 5
  const timerPct  = Math.max(0, (timer / (q.tempo || 30)) * 100)

  // ── Feedback screen ────────────────────────────────────────────────────────
  if (phase === 'feedback' && hasAns) {
    return (
      <div style={{
        minHeight: '100vh',
        background: isOk
          ? 'linear-gradient(160deg,#059669,#047857)'
          : 'linear-gradient(160deg,#dc2626,#991b1b)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center', gap: 14,
      }}>
        <div style={{ fontSize: 72, animation: 'bounceIn .5s ease' }}>
          {isOk ? '✅' : '❌'}
        </div>
        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 30, color: '#fff' }}>
          {isOk ? 'Correto! 🎉' : 'Errou! 😅'}
        </div>
        {isOk ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.65)' }}>
              Pontos ganhos
            </div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 60, color: '#fbbf24', lineHeight: 1 }}>
              +{lastPts.toLocaleString('pt-BR')}
            </div>
            {streak >= 2 && (
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fde68a' }}>
                🔥 {streak} acertos seguidos!
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', fontWeight: 700, maxWidth: 320 }}>
            Resposta correta: <strong style={{ color: '#fbbf24' }}>{LABELS[q.correta]}</strong> — {q.opcoes[q.correta]}
          </div>
        )}
        <div className="score-box" style={{ marginTop: 8, width: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.55)', marginBottom: 2 }}>
            Total
          </div>
          <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
        </div>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
          Aguardando próxima pergunta…
        </p>
      </div>
    )
  }

  // ── Main question screen ───────────────────────────────────────────────────
  return (
    <div className="game-bg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,.18)' }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,.65)' }}>
          {cqIdx + 1} / {questions.length}
        </span>
        <div className={`timer-circle ${timerWarn ? 'warn' : ''}`}>
          {timer}
        </div>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: '#fbbf24' }}>
          {myScore.toLocaleString('pt-BR')} pts
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${((cqIdx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Timer bar */}
      <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="timer-bar-wrap">
          <div className={`timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 700, flexShrink: 0 }}>
          {q.pontuacao} pts
        </span>
      </div>

      {/* Question card */}
      <div style={{ padding: '0 12px 10px' }}>
        <div className="q-card">
          {q.imagem && (
            <img
              src={q.imagem}
              alt="pergunta"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="q-text">{q.pergunta}</div>
        </div>
      </div>

      {/* Answer options */}
      <div style={{ padding: '0 12px', flex: 1 }}>
        <div className="opt-grid">
          {q.opcoes.filter(Boolean).map((opt, i) => {
            let extra = ''
            if (hasAns) {
              if (i === q.correta)      extra = 'correct'
              else if (i === myAns)     extra = 'wrong-my'
              else                      extra = 'wrong'
            }
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={hasAns || timer === 0}
                className={`opt-btn ${OPT_CLS[i] || 'opt-1'} ${extra}`}
              >
                <div className="opt-icon">{OPT_SHAPES[i] || '●'}</div>
                <div className="opt-text">{opt}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Score footer */}
      <div style={{ padding: '10px 14px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,.45)' }}>
          Pontuação
        </div>
        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: '#fbbf24' }}>
          {myScore.toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
