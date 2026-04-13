import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { Badge } from '../components/UI'

export default function PlayerWait() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const playerName = useStore(s => s.playerName)
  const playerAvatar = useStore(s => s.playerAvatar)

  useEffect(() => {
    const u = onSnapshot(doc(db, 'rooms', roomId), s => {
      const d = s.data()
      if (d?.status === 'playing') navigate(`/play/${roomId}`)
      if (d?.status === 'finished') navigate('/')
    })
    return u
  }, [roomId])

  const [playerCount, setPlayerCount] = React.useState(0)
  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s => {
      setPlayerCount(s.size)
    })
    return u
  }, [roomId])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(104,67,255,0.2) 0%, transparent 70%), var(--bg)',
      }}>
      {/* Orb */}
      <div className="orb mb-6 animate-float" style={{ width: 120, height: 120 }}>
        <span className="text-5xl">{playerAvatar || '🦊'}</span>
      </div>

      <h2 className="font-display font-bold text-2xl mb-1">{playerName || 'Jogador'}</h2>
      <p className="text-[--muted] mb-8">Você está na fila! 🎉</p>

      <div className="flex flex-col items-center gap-4">
        <div className="text-[--text2] text-base">
          Aguardando o admin iniciar o jogo…
        </div>

        {/* Animated dots */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.7,
            }} />
          ))}
        </div>

        <Badge variant="purple">
          👥 {playerCount} jogador{playerCount !== 1 ? 'es' : ''} na sala
        </Badge>
      </div>

      <div className="mt-10 text-[--muted] text-sm">
        Sala: <code className="px-2 py-0.5 rounded text-xs font-mono"
          style={{ background: 'var(--surface2)' }}>{roomId}</code>
      </div>
    </div>
  )
}
