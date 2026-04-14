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
    const u = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s => {
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score || 0) - (a.score || 0)))
    })
    return u
  }, [roomId])

  useEffect(() => {
    const fire = (angle, x) => confetti({
      particleCount: 80, spread: 70, origin: { x, y: 0.8 }, angle,
      colors: ['#46178f', '#ffdb00', '#e21b3c', '#1368ce', '#26890c'],
    })
    const t1 = setTimeout(() => { fire(60, 0.1); fire(120, 0.9) }, 500)
    const t2 = setTimeout(() => { fire(80, 0.3); fire(100, 0.7) }, 1000)
    const t3 = setTimeout(() => confetti({ particleCount: 150, spread: 110, origin: { x: 0.5, y: 0.6 } }), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const [p1, p2, p3, ...rest] = players
  const myRank = players.findIndex(p => p.id === playerId) + 1
  const me = players.find(p => p.id === playerId)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="k-logo">kahoot<span>!</span></span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>🏠 Home</button>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center' }}>
          <span style={{ background: 'rgba(255,219,0,0.2)', color: '#ffdb00', border: '1px solid rgba(255,219,0,0.4)', borderRadius: 99, padding: '6px 16px', fontWeight: 700, fontSize: 14 }}>
            🎉 Resultado final!
          </span>
        </div>

        {/* Podium */}
        <div className="podium">
          {/* 2nd */}
          <div className="pod-col">
            {p2 ? <>
              <div className="pod-emoji" style={{ animationDelay: '.3s' }}>{p2.avatar || '🦊'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', maxWidth: 80, lineHeight: 1.2 }}>{p2.nome}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{(p2.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p2">2</div>
            </> : <div className="pod-block pod-p2" />}
          </div>

          {/* 1st */}
          <div className="pod-col">
            {p1 ? <>
              <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>🏆</div>
              <div className="pod-emoji big" style={{ animationDelay: '.1s' }}>{p1.avatar || '🦊'}</div>
              <div style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', maxWidth: 90, lineHeight: 1.2 }}>{p1.nome}</div>
              <div style={{ fontSize: 13, color: '#ffdb00', fontWeight: 700 }}>{(p1.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p1">1</div>
            </> : <div className="pod-block pod-p1" />}
          </div>

          {/* 3rd */}
          <div className="pod-col">
            {p3 ? <>
              <div className="pod-emoji" style={{ animationDelay: '.4s' }}>{p3.avatar || '🦊'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', maxWidth: 80, lineHeight: 1.2 }}>{p3.nome}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{(p3.score || 0).toLocaleString('pt-BR')}</div>
              <div className="pod-block pod-p3">3</div>
            </> : <div className="pod-block pod-p3" />}
          </div>
        </div>

        {/* My result */}
        {me && myRank > 0 && (
          <div style={{ textAlign: 'center', padding: '16px 20px', background: 'rgba(255,219,0,0.12)', border: '2px solid rgba(255,219,0,0.4)', borderRadius: 8, animation: 'scaleIn .4s ease' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Seu resultado</div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 48, color: '#ffdb00', lineHeight: 1 }}>#{myRank}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{(me.score || 0).toLocaleString('pt-BR')} pontos</div>
          </div>
        )}

        {/* Remaining players */}
        {rest.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Outros participantes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rest.map((p, i) => (
                <RankItem key={p.id} rank={i + 4} player={p} isMe={p.id === playerId} delay={i * 40} />
              ))}
            </div>
          </div>
        )}

        <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary">📊 Ver ranking completo</button>
        <button onClick={() => navigate('/')} className="btn btn-secondary">🏠 Início</button>
      </div>
    </div>
  )
}
