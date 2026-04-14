import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, onSnapshot, query, collection, where, orderBy } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { RankItem, LABELS } from '../components/UI'
import toast from 'react-hot-toast'

const OPT_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
const OPT_SHAPES = ['▲', '◆', '●', '■']

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
  const uid = useStore_uid()

  function useStore_uid() {
    try { return window.__quizlive_uid } catch(e) { return null }
  }

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

  // QR
  useEffect(() => {
    if (!room || room.status !== 'waiting' || qrDoneRef.current) return
    setTimeout(() => {
      const canvas = document.getElementById('qr-canvas')
      if (canvas) {
        qrDoneRef.current = true
        QRCode.toCanvas(canvas, getJoinLink(roomId), { width: 190, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' } })
      }
    }, 80)
  }, [room?.status])

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'playing') { clearInterval(timerRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    setTimer(cq.tempo || 30)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.currentQuestion, room?.status])

  // Auto mode
  useEffect(() => {
    if (!room?.autoMode || room.status !== 'playing') { clearTimeout(autoRef.current); return }
    const cq = questions[room.currentQuestion]
    if (!cq) return
    const total = (cq.tempo || 30) + (room.autoInterval || 5)
    autoRef.current = setTimeout(() => {
      if (room.currentQuestion < questions.length - 1)
        updateDoc(doc(db, 'rooms', roomId), { currentQuestion: room.currentQuestion + 1 })
      else
        updateDoc(doc(db, 'rooms', roomId), { status: 'finished' }).then(() => navigate(`/room/${roomId}/podium`))
    }, total * 1000)
    return () => clearTimeout(autoRef.current)
  }, [room?.currentQuestion, room?.status, room?.autoMode])

  if (!room) return (
    <div style={{ minHeight: '100vh', background: '#46178f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  const cq = room.currentQuestion || 0
  const curQ = questions[cq]
  const answeredForQ = answers.filter(a => a.questionId === curQ?.id)
  const pct = players.length ? Math.round(answeredForQ.length / players.length * 100) : 0
  const timerWarn = timer <= 5 && timer > 0
  const timerPct = curQ ? (timer / (curQ.tempo || 30)) * 100 : 0
  const optStats = (curQ?.opcoes || []).map((_, i) => answeredForQ.filter(a => a.resposta === i).length)
  const maxStat = Math.max(...optStats, 1)

  // ── WAITING ──
  if (room.status === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="k-logo">kahoot<span>!</span></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#ffdb00', color: '#1a1000', borderRadius: 99, padding: '4px 12px', fontWeight: 700, fontSize: 13 }}>
              ⏳ Aguardando
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: 16 }}>

          {/* PIN + QR */}
          <div className="k-pin-box" style={{ textAlign: 'center' }}>
            <div className="k-pin-label">PIN do jogo</div>
            <div className="k-pin-num">{roomId.slice(0, 20)}</div>
          </div>

          <div className="qr-wrap">
            <canvas id="qr-canvas" width="190" height="190" />
          </div>

          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 400 }}>
            <button onClick={() => { navigator.clipboard.writeText(getJoinLink(roomId)); toast.success('Link copiado!') }}
              className="btn btn-secondary btn-sm flex-1">📋 Copiar link</button>
            <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('PIN copiado!') }}
              className="btn btn-secondary btn-sm flex-1">🔑 Copiar PIN</button>
          </div>

          {/* Players */}
          <div style={{ width: '100%', maxWidth: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>👥 Participantes</span>
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 12px', fontWeight: 700, fontSize: 14 }}>{players.length}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40 }}>
              {players.length === 0
                ? <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Aguardando jogadores…</span>
                : players.map(p => (
                  <div key={p.id} className="chip" style={{ animation: 'scaleIn .2s ease' }}>
                    <span>{p.avatar}</span><span style={{ fontWeight: 700 }}>{p.nome}</span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'playing', currentQuestion: 0 })}
            disabled={players.length === 0}
            className="btn btn-primary"
            style={{ maxWidth: 400, padding: '16px 24px', fontSize: 18, boxShadow: '0 6px 0 rgba(0,0,0,0.3)' }}>
            {players.length === 0 ? 'Aguardando jogadores…' : `🚀 Iniciar (${players.length} jogador${players.length !== 1 ? 'es' : ''})`}
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING ──
  if (room.status === 'playing' && curQ) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="k-logo" style={{ fontSize: 18 }}>kahoot<span>!</span></span>
          <span style={{ background: '#2ecc71', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 700, fontSize: 12 }}>🔴 Ao vivo</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>{cq + 1}/{questions.length}</span>
        </div>

        {/* Progress */}
        <div className="k-progress">
          <div className="k-progress-fill" style={{ width: `${((cq + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 600 }}>
            <div className={`k-timer-circle ${timerWarn ? 'warn' : ''}`} style={{ flexShrink: 0, width: 60, height: 60, fontSize: 24 }}>{timer}</div>
            <div style={{ flex: 1 }}>
              <div className="k-timer-bar-wrap">
                <div className={`k-timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div style={{ padding: '0 12px 10px' }}>
          <div className="k-question" style={{ maxWidth: 700, margin: '0 auto' }}>
            {curQ.imagem && <img src={curQ.imagem} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 10 }} onError={e => e.target.style.display = 'none'} />}
            <div className="k-question-text">{curQ.pergunta}</div>
          </div>
        </div>

        {/* Answer stats bar chart */}
        <div style={{ padding: '0 12px 10px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 8 }}>
              {curQ.opcoes.map((opt, i) => {
                const cnt = optStats[i] || 0
                const h = maxStat > 0 ? Math.max(8, Math.round((cnt / maxStat) * 64)) : 8
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{cnt}</span>
                    <div style={{ width: '100%', height: h, background: OPT_COLORS[i], borderRadius: '4px 4px 0 0', transition: 'height .5s ease', minHeight: 8 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {curQ.opcoes.map((opt, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 16, display: 'block' }}>{OPT_SHAPES[i]}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {i === curQ.correta ? '✓ ' : ''}{opt?.slice(0, 12)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Answer count */}
        <div style={{ padding: '0 12px 10px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 18 }}>✍️</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Respostas</span>
                <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900 }}>
                  <span style={{ color: '#ffdb00' }}>{answeredForQ.length}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}> / {players.length}</span>
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#ffdb00', borderRadius: 99, transition: 'width .4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '0 12px 12px', maxWidth: 700, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cq < questions.length - 1
            ? <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { currentQuestion: cq + 1 })}
                className="btn btn-primary" style={{ padding: '14px 24px', fontSize: 16 }}>
                Próxima pergunta →
              </button>
            : <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' }).then(() => navigate(`/room/${roomId}/podium`))}
                className="btn btn-success" style={{ padding: '14px 24px', fontSize: 16 }}>
                🏁 Encerrar e ver pódio
              </button>
          }
          <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })}
            className="btn btn-danger btn-sm">⏹ Encerrar agora</button>
        </div>

        {/* Live ranking */}
        <div style={{ padding: '0 12px 24px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>📊 Ranking ao vivo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.slice(0, 5).map((p, i) => (
              <RankItem key={p.id} rank={i + 1} player={p} delay={i * 50} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── FINISHED ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏁</div>
        <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26 }}>Jogo encerrado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{players.length} participantes · {questions.length} perguntas</p>
      </div>
      <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-primary" style={{ maxWidth: 340, padding: '16px 24px', fontSize: 18 }}>🏆 Ver pódio</button>
      <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary" style={{ maxWidth: 340 }}>📊 Ranking completo</button>
      <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ maxWidth: 340 }}>+ Criar nova sala</button>
    </div>
  )
}
