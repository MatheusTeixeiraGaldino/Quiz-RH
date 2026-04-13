import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import { db } from '../firebase'
import { useStore } from '../store'
import { TopBar, Logo, RankItem } from '../components/UI'

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

  // Confetti on mount
  useEffect(() => {
    const fire = (angle, x) => confetti({
      particleCount: 80,
      spread: 70,
      origin: { x, y: 0.8 },
      angle,
      colors: ['#6843ff', '#ff2d78', '#00d4ff', '#ffd60a', '#00ff88'],
    })
    const t1 = setTimeout(() => { fire(60, 0.1); fire(120, 0.9) }, 400)
    const t2 = setTimeout(() => { fire(80, 0.3); fire(100, 0.7) }, 900)
    const t3 = setTimeout(() => {
      confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.6 }, colors: ['#6843ff', '#ff2d78', '#ffd60a'] })
    }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const [p1, p2, p3, ...rest] = players

  return (
    <div className="min-h-screen">
      <TopBar left={<Logo size="sm" />} right={
        <button onClick={() => navigate('/')} className="btn btn-secondary text-sm py-2 px-3" style={{ width: 'auto' }}>🏠 Home</button>
      } />

      <div className="screen">
        <div className="text-center mb-2">
          <span className="badge bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
            🎉 Resultado final!
          </span>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 py-4">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2">
            {p2 ? (
              <>
                <div className="text-4xl animate-bounce-in" style={{ animationDelay: '0.3s' }}>{p2.avatar || '🦊'}</div>
                <div className="text-xs font-semibold text-center max-w-[80px] leading-tight">{p2.nome}</div>
                <div className="text-xs text-[--muted]">{(p2.score || 0).toLocaleString('pt-BR')}</div>
                <div className="w-20 flex items-center justify-center rounded-t-xl font-display font-black text-2xl glow-silver"
                  style={{ height: 72, background: 'linear-gradient(180deg, #b2bec3, #7f8c8d)', color: '#0a0e1a', animation: 'scaleIn 0.5s ease 0.3s both' }}>
                  2
                </div>
              </>
            ) : <div className="w-20 rounded-t-xl" style={{ height: 72, background: 'var(--surface2)' }} />}
          </div>

          {/* 1st */}
          <div className="flex flex-col items-center gap-2">
            {p1 ? (
              <>
                <div className="text-6xl animate-bounce-in" style={{ animationDelay: '0.1s' }}>{p1.avatar || '🦊'}</div>
                <div className="text-sm font-bold text-center max-w-[90px] leading-tight">{p1.nome}</div>
                <div className="text-xs text-[--muted]">{(p1.score || 0).toLocaleString('pt-BR')}</div>
                <div className="w-24 flex items-center justify-center rounded-t-xl font-display font-black text-3xl glow-gold"
                  style={{ height: 100, background: 'linear-gradient(180deg, #ffd60a, #e6b800)', color: '#1a1000', animation: 'scaleIn 0.5s ease 0.2s both', boxShadow: '0 -4px 24px rgba(255,214,10,0.4)' }}>
                  1
                </div>
              </>
            ) : <div className="w-24 rounded-t-xl" style={{ height: 100, background: 'var(--surface2)' }} />}
          </div>

          {/* 3rd */}
          <div className="flex flex-col items-center gap-2">
            {p3 ? (
              <>
                <div className="text-4xl animate-bounce-in" style={{ animationDelay: '0.4s' }}>{p3.avatar || '🦊'}</div>
                <div className="text-xs font-semibold text-center max-w-[80px] leading-tight">{p3.nome}</div>
                <div className="text-xs text-[--muted]">{(p3.score || 0).toLocaleString('pt-BR')}</div>
                <div className="w-20 flex items-center justify-center rounded-t-xl font-display font-black text-2xl glow-bronze"
                  style={{ height: 54, background: 'linear-gradient(180deg, #cd7c32, #8d4e0e)', color: '#1a0800', animation: 'scaleIn 0.5s ease 0.4s both' }}>
                  3
                </div>
              </>
            ) : <div className="w-20 rounded-t-xl" style={{ height: 54, background: 'var(--surface2)' }} />}
          </div>
        </div>

        {/* My result highlight */}
        {playerId && players.find(p => p.id === playerId) && (() => {
          const myRank = players.findIndex(p => p.id === playerId) + 1
          const me = players.find(p => p.id === playerId)
          return (
            <div className="card text-center animate-scale-in" style={{ borderColor: 'var(--accent)', background: 'rgba(104,67,255,0.06)' }}>
              <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-1">Seu resultado</div>
              <div className="font-display font-black text-4xl" style={{ color: 'var(--accent)' }}>#{myRank}</div>
              <div className="text-sm text-[--muted] mt-1">{(me.score || 0).toLocaleString('pt-BR')} pontos</div>
            </div>
          )
        })()}

        {/* Remaining players */}
        {rest.length > 0 && (
          <div className="card">
            <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">Outros participantes</div>
            <div className="flex flex-col gap-2">
              {rest.map((p, i) => (
                <RankItem key={p.id} rank={i + 4} player={p} isMe={p.id === playerId} delay={i * 50} />
              ))}
            </div>
          </div>
        )}

        <button onClick={() => navigate(`/room/${roomId}/ranking`)} className="btn btn-secondary w-full">
          📊 Ver ranking completo
        </button>
        <button onClick={() => navigate('/')} className="btn btn-secondary w-full">
          🏠 Início
        </button>
      </div>
    </div>
  )
}
