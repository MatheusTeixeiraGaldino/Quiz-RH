import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, onSnapshot, query, collection, where, orderBy } from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../firebase'
import { RankItem, OPT_COLORS, OPT_SHAPES, LABELS } from '../components/UI'
import toast from 'react-hot-toast'

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
  const qrRef = useRef(false)
  const autoRef = useRef(null)
  const prevQ = useRef(null)

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
    if (!room || room.status !== 'waiting' || qrRef.current) return
    setTimeout(() => {
      const canvas = document.getElementById('qr-canvas')
      if (canvas) { qrRef.current = true; QRCode.toCanvas(canvas, getJoinLink(roomId), { width: 180, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } }) }
    }, 80)
  }, [room?.status])

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'playing' || !questions.length) return
    const cq = questions[room.currentQuestion]
    if (!cq) return
    if (prevQ.current !== room.currentQuestion) {
      prevQ.current = room.currentQuestion
      setTimer(cq.tempo || 30)
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 }), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [room?.currentQuestion, room?.status, questions.length])

  // Auto mode
  useEffect(() => {
    if (!room?.autoMode || room.status !== 'playing' || !questions.length) { clearTimeout(autoRef.current); return }
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
  }, [room?.currentQuestion, room?.status, room?.autoMode, questions.length])

  if (!room) return <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>

  const cqIdx = room.currentQuestion || 0
  const curQ = questions[cqIdx]
  const answeredForQ = answers.filter(a => a.questionId === curQ?.id)
  const pct = players.length ? Math.round(answeredForQ.length / players.length * 100) : 0
  const timerWarn = timer <= 5 && timer > 0
  const timerPct = curQ ? (timer / (curQ.tempo || 30)) * 100 : 0
  const optStats = (curQ?.opcoes || []).map((_, i) => answeredForQ.filter(a => a.resposta === i).length)
  const maxStat = Math.max(...optStats, 1)

  const gameBg = 'linear-gradient(160deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)'

  // ── WAITING ──────────────────────────────────────────────────────────────
  if (room.status === 'waiting') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12, border: '1.5px solid #fbbf24' }}>⏳ Aguardando</span>
      </div>
      <div className="screen" style={{ maxWidth: 600 }}>
        {/* PIN + QR */}
        <div className="card" style={{ textAlign: 'center', border: '2px solid rgba(139,92,246,.3)', boxShadow: '0 4px 0 rgba(139,92,246,.15)' }}>
          <div className="card-title">🔗 Compartilhe para entrar</div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', display: 'inline-block', boxShadow: '0 4px 0 rgba(139,92,246,.15)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#8b5cf6', marginBottom: 4 }}>PIN do jogo</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 40, color: '#4c1d95', letterSpacing: 5 }}>{roomId}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className="qr-wrap"><canvas id="qr-canvas" width="180" height="180" /></div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, wordBreak: 'break-all', fontWeight: 600 }}>{getJoinLink(roomId)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(getJoinLink(roomId)); toast.success('Link copiado!') }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📋 Copiar link</button>
            <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('PIN copiado!') }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>🔑 Copiar PIN</button>
          </div>
        </div>
        {/* Players */}
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
        {/* Questions list */}
        <div className="card">
          <div className="card-title">📋 {questions.length} pergunta{questions.length !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
            {questions.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f5f3ff', borderRadius: 8, fontSize: 13 }}>
                <span style={{ fontFamily: "'Fredoka One',cursive", color: '#8b5cf6', minWidth: 24, fontSize: 12 }}>#{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 700, color: '#1e1b4b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.pergunta}</span>
                <span className="badge badge-purple" style={{ fontSize: 10 }}>{q.pontuacao}pts</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'playing', currentQuestion: 0 })}
          disabled={players.length === 0} className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {players.length === 0 ? '⏳ Aguardando jogadores…' : `🚀 Iniciar (${players.length} jogador${players.length !== 1 ? 'es' : ''})`}
        </button>
      </div>
    </div>
  )

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (room.status === 'playing' && curQ) return (
    <div style={{ minHeight: '100vh', background: gameBg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'rgba(0,0,0,.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: '#fff' }}>OL Quiz! ⚡</span>
        <span style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '4px 12px', fontWeight: 800, fontSize: 12 }}>🔴 Ao vivo</span>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700 }}>{cqIdx + 1}/{questions.length}</span>
      </div>
      <div className="progress-wrap" style={{ margin: 0 }}>
        <div className="progress-fill" style={{ width: `${((cqIdx + 1) / questions.length) * 100}%` }} />
      </div>
      {/* Timer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 6px' }}>
        <div className={`timer-circle ${timerWarn ? 'warn' : ''}`} style={{ width: 56, height: 56, fontSize: 22 }}>{timer}</div>
        <div className="timer-bar-wrap" style={{ flex: 1 }}>
          <div className={`timer-bar ${timerWarn ? 'warn' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>
      </div>
      {/* Question */}
      <div style={{ padding: '0 12px 10px' }}>
        <div className="q-card">
          {curQ.imagem && <img src={curQ.imagem} alt="" onError={e => e.target.style.display = 'none'} />}
          <div className="q-text">{curQ.pergunta}</div>
        </div>
      </div>
      {/* Bar chart of answers */}
      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, marginBottom: 6 }}>
            {curQ.opcoes.map((_, i) => {
              const cnt = optStats[i] || 0
              const h = Math.max(6, Math.round((cnt / maxStat) * 60))
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{cnt}</span>
                  <div style={{ width: '100%', height: h, background: OPT_COLORS[i], borderRadius: '4px 4px 0 0', transition: 'height .5s ease', minHeight: 6 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {curQ.opcoes.map((opt, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 14, color: i === curQ.correta ? '#4ade80' : 'rgba(255,255,255,.7)' }}>
                {OPT_SHAPES[i]}<br />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{(opt || '').slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Answer count */}
      <div style={{ padding: '0 12px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ fontSize: 18 }}>✍️</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>Respostas</span>
              <span style={{ fontFamily: "'Fredoka One',cursive", color: '#fbbf24' }}>{answeredForQ.length} / {players.length}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#fbbf24', borderRadius: 99, transition: 'width .4s' }} />
            </div>
          </div>
        </div>
      </div>
      {/* Controls */}
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cqIdx < questions.length - 1
          ? <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { currentQuestion: cqIdx + 1 })} className="btn btn-white" style={{ fontSize: 16 }}>Próxima pergunta →</button>
          : <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' }).then(() => navigate(`/room/${roomId}/podium`))} className="btn btn-success" style={{ fontSize: 16 }}>🏁 Encerrar e ver pódio</button>
        }
        <button onClick={() => updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })} className="btn btn-danger btn-sm">⏹ Encerrar agora</button>
      </div>
      {/* Live ranking */}
      <div style={{ padding: '0 12px 24px' }}>
        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>📊 Ranking ao vivo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {players.slice(0, 5).map((p, i) => <RankItem key={p.id} rank={i + 1} player={p} delay={i * 50} />)}
        </div>
      </div>
    </div>
  )

  // ── FINISHED ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 14 }}>
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
