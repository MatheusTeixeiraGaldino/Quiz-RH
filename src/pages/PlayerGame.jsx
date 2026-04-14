import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, onSnapshot, query, collection, where, orderBy,
  setDoc, updateDoc, getDoc, increment, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { OPT_ICONS, OPT_COLORS_CSS, LABELS } from '../components/UI'

const OPT_COLORS_HEX = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const OPT_SHADOWS   = ['#9b0e25', '#0d4a9e', '#9a6f00', '#164d05']
const OPT_SHAPES    = ['▲', '◆', '●', '■']

export default function PlayerGame() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const soundEnabled = useStore(s => s.soundEnabled)

  const [room, setRoom] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answered, setAnswered] = useState({})
  const [myScore, setMyScore] = useState(0)
  const [timer, setTimer] = useState(30)
  const [phase, setPhase] = useState('question') // 'question' | 'feedback'
  const [lastPts, setLastPts] = useState(0)
  const [streak, setStreak] = useState(0)
  const timerRef = useRef(null)
  const playerId = user?.uid

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'rooms', roomId), s => setRoom({ id: s.id, ...s.data() }))
    const u2 = onSnapshot(query(collection(db, 'questions'), where('roomId', '==', roomId), orderBy('ordem')), s =>
      setQuestions(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(query(collection(db, 'answers'), where('playerId', '==', playerId), where('roomId', '==', roomId)), s => {
      let total = 0; const ans = {}
      s.docs.forEach(d => {
        const da = d.data()
        ans[da.questionId] = da.resposta
        total += (da.pontosGanhos || 0)
      })
      setAnswered(ans); setMyScore(total)
    })
    return () => { u1(); u2(); u3() }
  }, [roomId, playerId])

  useEffect(() => {
    if (!room || room.status !== 'playing') { clearInterval(timerRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    setTimer(cq.tempo || 30)
    setPhase('question')
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.currentQuestion, room?.status, questions.length])

  const playSound = (type) => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      if (type === 'correct') {
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + .1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + .2)
        gain.gain.setValueAtTime(.3, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + .5)
        osc.start(); osc.stop(ctx.currentTime + .5)
      } else {
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        osc.frequency.setValueAtTime(150, ctx.currentTime + .15)
        gain.gain.setValueAtTime(.3, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + .4)
        osc.start(); osc.stop(ctx.currentTime + .4)
      }
    } catch (e) {}
  }

  const answer = async (idx) => {
    const q = questions[room?.currentQuestion]
    if (!q || answered[q.id] !== undefined || !playerId || timer === 0) return
    const isCorrect = idx === q.correta
    const maxTime = q.tempo || 30
    const timeBonus = Math.max(0, Math.round((timer / maxTime) * q.pontuacao * 0.5))
    const pts = isCorrect ? q.pontuacao + timeBonus : 0

    setAnswered(prev => ({ ...prev, [q.id]: idx }))
    setLastPts(pts)
    if (isCorrect) setStreak(s => s + 1); else setStreak(0)
    setPhase('feedback')
    playSound(isCorrect ? 'correct' : 'wrong')

    const ansId = `${playerId}_${q.id}`
    try {
      const ex = await getDoc(doc(db, 'answers', ansId))
      if (!ex.exists()) {
        await setDoc(doc(db, 'answers', ansId), {
          playerId, questionId: q.id, roomId,
          resposta: idx, correta: isCorrect, pontosGanhos: pts,
          ts: serverTimestamp(),
        })
        if (pts > 0) await updateDoc(doc(db, 'players', playerId), { score: increment(pts) })
      }
    } catch (e) { console.error(e) }
  }

  // ── GAME OVER ──
  if (room?.status === 'finished') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 20 }}>
        <div style={{ fontSize: 80, animation: 'bounceIn .6s ease' }}>🏁</div>
        <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 32 }}>Fim de jogo!</h2>
        <div className="score-box" style={{ width: 240, margin: '8px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Sua pontuação</div>
          <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
        </div>
        <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary" style={{ maxWidth: 280, padding: '16px 24px', fontSize: 18 }}>
          🏆 Ver pódio
        </button>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ maxWidth: 280 }}>
          🏠 Início
        </button>
      </div>
    )
  }

  if (!room || !questions.length) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  const cq = room.currentQuestion || 0
  const q = questions[cq]

  if (!q) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>⏳</div>
        <p style={{ fontWeight: 700, fontSize: 18 }}>Aguardando próxima pergunta…</p>
      </div>
    )
  }

  const myAns = answered[q.id]
  const hasAns = myAns !== undefined
  const isOk = hasAns && myAns === q.correta
  const timerWarn = timer <= 5
  const timerPct = (timer / (q.tempo || 30)) * 100

  // ── FEEDBACK PHASE (after answering) ──
  if (phase === 'feedback' && hasAns) {
    return (
      <div style={{ minHeight: '100vh', background: isOk ? 'linear-gradient(180deg,#1e7e34,#0d5c20)' : 'linear-gradient(180deg,#c0392b,#8e1c13)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="k-points-popup">
          <div className="k-correct-icon">{isOk ? '✅' : '❌'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {isOk ? 'Correto!' : 'Incorreto!'}
          </div>
          {isOk && (
            <>
              <div className="k-pts-label">+pontos</div>
              <div className="k-pts-num">+{lastPts.toLocaleString('pt-BR')}</div>
              {streak >= 2 && (
                <div className="k-streak">🔥 {streak} acertos seguidos!</div>
              )}
            </>
          )}
          {!isOk && (
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
              Resposta certa: <strong style={{ color: '#ffdb00' }}>{LABELS[q.correta]}</strong> — {q.opcoes[q.correta]}
            </div>
          )}
          <div style={{ marginTop: 24 }} className="score-box">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Total</div>
            <div className="score-num">{myScore.toLocaleString('pt-BR')}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTION PHASE ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar: question counter + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{cq + 1}/{questions.length}</span>
        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 16, color: '#ffdb00' }}>
          {myScore.toLocaleString('pt-BR')} pts
        </span>
      </div>

      {/* Progress bar */}
      <div className="k-progress" style={{ margin: '0 0 2px' }}>
        <div className="k-progress-fill" style={{ width: `${((cq + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Timer */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 400 }}>
          <div className={`k-timer-circle ${timerWarn ? 'warn' : ''}`} style={{ flexShrink: 0 }}>{timer}</div>
          <div style={{ flex: 1 }}>
            <div className="k-timer-bar-wrap">
              <div className={`k-timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0, fontWeight: 600 }}>
            {q.pontuacao}pts
          </div>
        </div>
      </div>

      {/* Question card */}
      <div style={{ padding: '0 12px 12px' }}>
        <div className="k-question">
          {q.imagem && (
            <img src={q.imagem} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 12 }} onError={e => e.target.style.display = 'none'} />
          )}
          <div className="k-question-text">{q.pergunta}</div>
        </div>
      </div>

      {/* Answer options — Kahoot 4 colors */}
      <div style={{ padding: '0 12px', flex: 1 }}>
        <div className="opt-grid">
          {q.opcoes.filter(Boolean).map((opt, i) => {
            let extraCls = ''
            if (hasAns) {
              if (i === q.correta) extraCls = 'correct'
              else if (i === myAns) extraCls = 'wrong-my'
              else extraCls = 'wrong'
            }
            const colorCls = OPT_COLORS_CSS[i] || 'opt-red'
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={hasAns || timer === 0}
                className={`opt-btn ${colorCls} ${extraCls}`}
              >
                <div className="opt-icon">{OPT_SHAPES[i] || '●'}</div>
                <div className="opt-text">{opt}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom score bar */}
      <div style={{ padding: '12px 16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pontuação</div>
        <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 28, color: '#ffdb00' }}>
          {myScore.toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
