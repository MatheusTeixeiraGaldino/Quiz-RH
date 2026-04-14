import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import { db } from '../firebase'
import { useStore } from '../store'
import { RankItem } from '../components/UI'

export default function Podium() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const playerId = useStore(s => s.user?.uid)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s =>
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0))))
    return u
  }, [roomId])

  useEffect(() => {
    const fire = (a, x) => confetti({ particleCount: 80, spread: 70, origin: { x, y: .8 }, angle: a, colors: ['#ff4d8d','#8b5cf6','#3b82f6','#f59e0b','#10b981'] })
    const t1 = setTimeout(() => { fire(60, .1); fire(120, .9) }, 400)
    const t2 = setTimeout(() => { fire(80, .3); fire(100, .7) }, 900)
    const t3 = setTimeout(() => confetti({ particleCount: 150, spread: 110, origin: { x: .5, y: .6 } }), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const [p1, p2, p3, ...rest] = players
  const myRank = players.findIndex(p => p.id === playerId) + 1
  const me = players.find(p => p.id === playerId)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>🏠 Home</button>
      </div>
      <div className="screen">
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'rgba(245,158,11,.1)', color: '#b45309', border: '1.5px solid rgba(245,158,11,.3)', borderRadius: 99, padding: '6px 18px', fontWeight: 800, fontSize: 14, display: 'inline-block' }}>🎉 Resultado final!</div>
        </div>
        {/* Podium */}
        <div className="podium">
          <div className="pod-col">
            {p2 ? <><div style={{ fontSize: 36, animation: 'bounceIn .6s .3s both' }}>{p2.avatar || '🦊'}</div>
              <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'center', maxWidth: 80, lineHeight: 1.2, color: '#1e1b4b' }}>{p2.nome}</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>{(p2.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p2">2</div></> : <div className="pod-block pod-p2" />}
          </div>
          <div className="pod-col">
            {p1 ? <><div style={{ fontSize: 14, fontWeight: 800, color: '#b45309', marginBottom: 2 }}>🏆</div>
              <div style={{ fontSize: 50, animation: 'bounceIn .6s .1s both' }}>{p1.avatar || '🦊'}</div>
              <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', maxWidth: 90, lineHeight: 1.2, color: '#1e1b4b' }}>{p1.nome}</div>
              <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 800 }}>{(p1.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p1">1</div></> : <div className="pod-block pod-p1" />}
          </div>
          <div className="pod-col">
            {p3 ? <><div style={{ fontSize: 36, animation: 'bounceIn .6s .4s both' }}>{p3.avatar || '🦊'}</div>
              <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'center', maxWidth: 80, lineHeight: 1.2, color: '#1e1b4b' }}>{p3.nome}</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>{(p3.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p3">3</div></> : <div className="pod-block pod-p3" />}
          </div>
        </div>
        {/* My result */}
        {me && myRank > 0 && (
          <div style={{ textAlign: 'center', padding: '16px 20px', background: 'rgba(139,92,246,.08)', border: '2px solid rgba(139,92,246,.25)', borderRadius: 14, animation: 'scaleIn .4s ease' }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 4 }}>Seu resultado</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 48, color: '#8b5cf6', lineHeight: 1 }}>#{myRank}</div>
            <div style={{ color: '#6b7280', fontWeight: 700, marginTop: 4 }}>{(me.score || 0).toLocaleString('pt-BR')} pontos</div>
          </div>
        )}
        {/* Rest */}
        {rest.length > 0 && (
          <div style={{ background: 'linear-gradient(160deg,#4f46e5,#7c3aed)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>Outros participantes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rest.map((p, i) => <RankItem key={p.id} rank={i + 4} player={p} isMe={p.id === playerId} delay={i * 40} />)}
            </div>
          </div>
        )}
        <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary">📊 Ranking completo</button>
        <button onClick={() => navigate('/')} className="btn btn-secondary">🏠 Início</button>
      </div>
    </div>
  )
}
