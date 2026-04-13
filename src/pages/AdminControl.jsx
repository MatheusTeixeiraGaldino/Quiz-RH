import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, onSnapshot, query, collection, where, orderBy } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { useStore } from '../store'
import { TopBar, Logo, Badge, AnswerBar, ProgressDots, RankItem } from '../components/UI'
import toast from 'react-hot-toast'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const OPT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']

function getJoinLink(roomId) {
  return `${location.origin}${location.pathname}#/join/${roomId}`
}

export default function AdminControl() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [questions, setQuestions] = useState([])
  const [players, setPlayers] = useState([])
  const [answers, setAnswers] = useState([])
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(null)
  const qrDoneRef = useRef(false)
  const autoRef = useRef(null)

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'rooms', roomId), s => setRoom({ id: s.id, ...s.data() }))
    const u2 = onSnapshot(query(collection(db, 'questions'), where('roomId', '==', roomId), orderBy('ordem')), s =>
      setQuestions(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s =>
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0))))
    const u4 = onSnapshot(query(collection(db, 'answers'), where('roomId', '==', roomId)), s =>
      setAnswers(s.docs.map(d => d.data())))
    return () => { u1(); u2(); u3(); u4() }
  }, [roomId])

  // QR code
  useEffect(() => {
    if (!room || room.status !== 'waiting' || qrDoneRef.current) return
    setTimeout(() => {
      const canvas = document.getElementById('qr-canvas')
      if (canvas) {
        qrDoneRef.current = true
        QRCode.toCanvas(canvas, getJoinLink(roomId), {
          width: 200, margin: 1,
          color: { dark: '#07071a', light: '#ffffff' }
        })
      }
    }, 100)
  }, [room?.status])

  // Timer per question
  useEffect(() => {
    if (!room || room.status !== 'playing') { clearInterval(timerRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    setTimer(cq.tempo || 30)
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
  }, [room?.currentQuestion, room?.status])

  // Auto mode
  useEffect(() => {
    if (!room?.autoMode || room.status !== 'playing') { clearTimeout(autoRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    const totalTime = (cq.tempo || 30) + (room.autoInterval || 5)
    autoRef.current = setTimeout(() => {
      if (room.currentQuestion < questions.length - 1) {
        updateDoc(doc(db, 'rooms', roomId), { currentQuestion: room.currentQuestion + 1 })
      } else {
        updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })
          .then(() => navigate(`/room/${roomId}/podium`))
      }
    }, totalTime * 1000)
    return () => clearTimeout(autoRef.current)
  }, [room?.currentQuestion, room?.status, room?.autoMode])

  const startGame = () => updateDoc(doc(db, 'rooms', roomId), { status: 'playing', currentQuestion: 0 })
  const nextQuestion = () => updateDoc(doc(db, 'rooms', roomId), { currentQuestion: room.currentQuestion + 1 })
  const finishGame = () => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })
    .then(() => navigate(`/room/${roomId}/podium`))
  const endNow = () => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })

  if (!room) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const cq = room.currentQuestion || 0
  const currentQ = questions[cq]
  const answeredForQ = answers.filter(a => a.questionId === currentQ?.id)
  const pct = players.length ? Math.round(answeredForQ.length / players.length * 100) : 0
  const timerPct = currentQ ? (timer / (currentQ.tempo || 30)) * 100 : 0
  const timerWarning = timer <= 10 && timer > 0

  // Stats: answers per option
  const optStats = (currentQ?.opcoes || []).map((_, i) =>
    answeredForQ.filter(a => a.resposta === i).length
  )

  return (
    <div className="min-h-screen">
      <TopBar
        left={<Logo size="sm" />}
        center={
          <div className={`badge text-xs font-semibold ${
            room.status === 'waiting' ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/20' :
            room.status === 'playing' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {room.status === 'waiting' ? '⏳ Aguardando' : room.status === 'playing' ? '🔴 Ao vivo' : '🏁 Encerrado'}
          </div>
        }
        right={
          <a href={getJoinLink(roomId)} target="_blank" rel="noreferrer"
            className="btn btn-secondary text-xs py-2 px-2" style={{ width: 'auto' }}>
            🔗 Link
          </a>
        }
      />

      <div className="screen wide">
        {/* ── WAITING ── */}
        {room.status === 'waiting' && (
          <>
            <div className="card card-glow text-center">
              <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-4">🔗 Link & QR Code para entrar</div>
              <div className="flex justify-center mb-3">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <canvas id="qr-canvas" width="200" height="200" />
                </div>
              </div>
              <div className="text-xs text-[--muted] mb-3 break-all px-2">{getJoinLink(roomId)}</div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(getJoinLink(roomId)); toast.success('Link copiado!') }}
                  className="btn btn-secondary flex-1 text-sm py-2">📋 Copiar link</button>
                <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Código copiado!') }}
                  className="btn btn-secondary flex-1 text-sm py-2">
                  🔑 {roomId.slice(0, 8)}…
                </button>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-[--muted]">👥 Participantes</div>
                <Badge variant="purple">{players.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {players.length === 0
                  ? <span className="text-[--muted] text-sm">Aguardando jogadores…</span>
                  : players.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm animate-scale-in"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <span>{p.avatar}</span><span className="font-medium">{p.nome}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="card">
              <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">📋 {questions.length} pergunta{questions.length !== 1 ? 's' : ''}</div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ background: 'var(--surface2)' }}>
                    <span className="font-display font-bold text-xs" style={{ color: 'var(--accent)' }}>#{i + 1}</span>
                    <span className="flex-1 truncate">{q.pergunta}</span>
                    <span className="text-xs text-[--muted]">{q.pontuacao}pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={startGame} disabled={players.length === 0}
              className="btn btn-primary w-full py-4 text-base font-bold">
              {players.length === 0 ? 'Aguardando jogadores…' : `🚀 Iniciar jogo (${players.length} jogador${players.length !== 1 ? 'es' : ''})`}
            </button>
          </>
        )}

        {/* ── PLAYING ── */}
        {room.status === 'playing' && currentQ && (
          <>
            <ProgressDots total={questions.length} current={cq} />

            {/* Timer */}
            <div className="flex items-center gap-3">
              <div className="font-display font-black text-3xl" style={{ color: timerWarning ? '#ff4466' : 'var(--accent)', minWidth: 48, transition: 'color 0.3s' }}>
                {timer}s
              </div>
              <div className="flex-1 timer-bar">
                <div className={`timer-fill ${timerWarning ? 'warning' : ''}`} style={{ width: `${timerPct}%` }} />
              </div>
              <span className="text-sm text-[--muted]">{cq + 1}/{questions.length}</span>
            </div>

            {/* Question card */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="purple">{currentQ.pontuacao} pts</Badge>
                <span className="text-xs text-[--muted]">{currentQ.type === 'truefalse' ? 'Verdadeiro/Falso' : 'Múltipla escolha'}</span>
              </div>
              {currentQ.imagem && (
                <img src={currentQ.imagem} alt="" className="w-full h-32 object-cover rounded-xl mb-3" />
              )}
              <div className="font-display font-bold text-xl leading-snug mb-4">{currentQ.pergunta}</div>

              {/* Options with stats */}
              <div className="grid grid-cols-2 gap-2">
                {currentQ.opcoes.map((o, i) => {
                  const count = optStats[i] || 0
                  const statPct = answeredForQ.length ? Math.round(count / answeredForQ.length * 100) : 0
                  return (
                    <div key={i} className="p-3 rounded-xl relative overflow-hidden"
                      style={{ border: `1.5px solid ${i === currentQ.correta ? '#00ff88' : OPT_COLORS[i]}`,
                               background: i === currentQ.correta ? 'rgba(0,255,136,0.08)' : `${OPT_COLORS[i]}11` }}>
                      <div className="absolute inset-0 pointer-events-none" style={{ background: `${OPT_COLORS[i]}22`, width: `${statPct}%`, transition: 'width 0.4s ease' }} />
                      <div className="relative flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: OPT_COLORS[i] }}>{LABELS[i]}</span>
                        <span className="text-sm flex-1 truncate">{o}</span>
                        <span className="text-xs font-bold" style={{ color: i === currentQ.correta ? '#00ff88' : 'var(--text2)' }}>{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Answer progress */}
            <AnswerBar answered={answeredForQ.length} total={players.length} />

            {/* Controls */}
            <div className="flex flex-col gap-2">
              {cq < questions.length - 1
                ? <button onClick={nextQuestion} className="btn btn-primary w-full py-3">Próxima pergunta →</button>
                : <button onClick={finishGame} className="btn btn-success w-full py-3">🏁 Encerrar e ver pódio</button>
              }
              <button onClick={endNow} className="btn btn-danger w-full text-sm py-2">⏹ Encerrar agora</button>
            </div>

            {/* Live ranking */}
            <div className="card">
              <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">📊 Ranking ao vivo</div>
              <div className="flex flex-col gap-2">
                {players.slice(0, 5).map((p, i) => (
                  <RankItem key={p.id} rank={i + 1} player={p} delay={i * 50} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── FINISHED ── */}
        {room.status === 'finished' && (
          <>
            <div className="card text-center py-8">
              <div className="text-6xl mb-4">🏁</div>
              <h2 className="font-display font-bold text-2xl mb-2">Jogo encerrado!</h2>
              <p className="text-[--muted] text-sm">{players.length} participantes · {questions.length} perguntas</p>
            </div>
            <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary w-full py-3">
              🏆 Ver pódio
            </button>
            <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary w-full">
              📊 Ranking completo
            </button>
            <button onClick={() => navigate('/admin')} className="btn btn-secondary w-full">
              + Criar nova sala
            </button>
          </>
        )}
      </div>
    </div>
  )
}
