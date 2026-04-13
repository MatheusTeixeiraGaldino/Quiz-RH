import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, query, collection, where, orderBy, setDoc, updateDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { ProgressDots, TimerBar } from '../components/UI'
import toast from 'react-hot-toast'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const OPT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
const OPT_CLASSES = ['opt-a', 'opt-b', 'opt-c', 'opt-d', 'opt-e', 'opt-f']

export default function PlayerGame() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const playerName = useStore(s => s.playerName)
  const playerAvatar = useStore(s => s.playerAvatar)
  const soundEnabled = useStore(s => s.soundEnabled)

  const [room, setRoom] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answered, setAnswered] = useState({})
  const [myScore, setMyScore] = useState(0)
  const [timer, setTimer] = useState(30)
  const [showFeedback, setShowFeedback] = useState(false)
  const timerRef = useRef(null)
  const playerId = user?.uid

  // Subscriptions
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'rooms', roomId), s => setRoom({ id: s.id, ...s.data() }))
    const u2 = onSnapshot(query(collection(db, 'questions'), where('roomId', '==', roomId), orderBy('ordem')), s =>
      setQuestions(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(query(collection(db, 'answers'), where('playerId', '==', playerId), where('roomId', '==', roomId)), s => {
      let total = 0
      const ans = {}
      s.docs.forEach(d => {
        const data = d.data()
        ans[data.questionId] = data.resposta
        total += (data.pontosGanhos || 0)
      })
      setAnswered(ans)
      setMyScore(total)
    })
    return () => { u1(); u2(); u3() }
  }, [roomId, playerId])

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'playing') { clearInterval(timerRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    setTimer(cq.tempo || 30)
    setShowFeedback(false)
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
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (type === 'correct') {
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch (e) {}
  }

  const answer = async (idx) => {
    const cq = questions[room?.currentQuestion]
    if (!cq || answered[cq.id] !== undefined || !playerId) return
    const isCorrect = idx === cq.correta

    // Speed bonus: more points for faster answers
    const maxTime = cq.tempo || 30
    const timeBonus = Math.max(0, Math.round((timer / maxTime) * cq.pontuacao * 0.5))
    const pts = isCorrect ? cq.pontuacao + timeBonus : 0

    setAnswered(prev => ({ ...prev, [cq.id]: idx }))
    setShowFeedback(true)
    playSound(isCorrect ? 'correct' : 'wrong')

    const ansId = `${playerId}_${cq.id}`
    try {
      const exists = await getDoc(doc(db, 'answers', ansId))
      if (!exists.exists()) {
        await setDoc(doc(db, 'answers', ansId), {
          playerId, questionId: cq.id, roomId,
          resposta: idx, correta: isCorrect, pontosGanhos: pts,
          ts: serverTimestamp(),
        })
        if (pts > 0) {
          await updateDoc(doc(db, 'players', playerId), { score: increment(pts) })
        }
      }
    } catch (e) { console.error(e) }
  }

  if (!room || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Game over
  if (room.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="text-7xl mb-4 animate-bounce-in">🏁</div>
        <h2 className="font-display font-bold text-3xl mb-2">Fim de jogo!</h2>
        <p className="text-[--muted] mb-6">Veja como você se saiu</p>
        <div className="card w-full max-w-xs mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-1">Sua pontuação final</div>
          <div className="font-display font-black text-5xl"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {myScore.toLocaleString('pt-BR')}
          </div>
        </div>
        <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary w-full max-w-xs mb-2 py-3">
          🏆 Ver pódio
        </button>
        <button onClick={() => navigate('/')} className="btn btn-secondary w-full max-w-xs">
          🏠 Início
        </button>
      </div>
    )
  }

  const cq = room.currentQuestion || 0
  const q = questions[cq]

  if (!q) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-4" style={{ animation: 'pulse 2s infinite' }}>⏳</div>
        <p className="text-[--muted] text-lg">Aguardando próxima pergunta…</p>
      </div>
    )
  }

  const myAnswer = answered[q.id]
  const hasAnswered = myAnswer !== undefined
  const isCorrect = hasAnswered && myAnswer === q.correta
  const timerPct = (timer / (q.tempo || 30)) * 100
  const timerWarning = timer <= 10

  return (
    <div className="screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[--muted] text-sm">{cq + 1} / {questions.length}</span>
        <div className="font-display font-black text-2xl" style={{ color: timerWarning ? '#ff4466' : 'var(--accent)', transition: 'color 0.3s' }}>
          {timer}s
        </div>
        <div className="font-display font-bold text-sm" style={{ color: 'var(--accent)' }}>
          {myScore.toLocaleString('pt-BR')} pts
        </div>
      </div>

      <ProgressDots total={questions.length} current={cq} />
      <TimerBar value={timer} max={q.tempo || 30} warning={timerWarning} />

      {/* Question */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="badge bg-violet-500/10 text-violet-300 border border-violet-500/25 text-xs">
            {q.pontuacao} pts base
          </span>
          <span className="text-xs text-[--muted]">
            {q.type === 'truefalse' ? '✔ V/F' : '🔢 Múltipla'}
          </span>
        </div>
        {q.imagem && (
          <img src={q.imagem} alt="" className="w-full h-36 object-cover rounded-xl mb-3" />
        )}
        <div className="font-display font-bold text-xl leading-snug">{q.pergunta}</div>
      </div>

      {/* Feedback */}
      {hasAnswered && showFeedback && (
        <div className={`text-center p-4 rounded-2xl animate-scale-in ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-red-500/10 border border-red-500/25'}`}>
          <div className="text-4xl mb-2 animate-bounce-in">{isCorrect ? '✅' : '❌'}</div>
          <div className="font-bold text-base" style={{ color: isCorrect ? 'var(--green)' : 'var(--red)' }}>
            {isCorrect ? 'Acertou!' : 'Errou…'}
          </div>
          {isCorrect
            ? <div className="font-display font-black text-2xl mt-1" style={{ color: 'var(--green)' }}>
                +{(answered._lastPts || q.pontuacao).toLocaleString('pt-BR')}
              </div>
            : <div className="text-sm text-[--muted] mt-1">
                Correta: <b style={{ color: 'var(--green)' }}>{LABELS[q.correta]}</b> — {q.opcoes[q.correta]}
              </div>
          }
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {q.opcoes.filter(Boolean).map((opt, i) => {
          let extraClass = ''
          if (hasAnswered) {
            if (i === q.correta) extraClass = 'correct'
            else if (i === myAnswer) extraClass = 'wrong'
          }
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={hasAnswered || timer === 0}
              className={`option-btn ${OPT_CLASSES[i]} ${extraClass} ${myAnswer === i && !extraClass ? 'selected' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${OPT_COLORS[i]}22`, color: OPT_COLORS[i] }}>
                  {LABELS[i]}
                </span>
                <span className="text-sm leading-snug">{opt}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Score */}
      <div className="text-center py-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-1">Pontuação total</div>
        <div className="font-display font-black text-3xl"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {myScore.toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
