import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'

export default function PlayerWait() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const playerName = useStore(s => s.playerName)
  const playerAvatar = useStore(s => s.playerAvatar)
  const [playerCount, setPlayerCount] = React.useState(0)
  const [players, setPlayers] = React.useState([])
  const [roomName, setRoomName] = React.useState('')

  useEffect(() => {
    const u = onSnapshot(doc(db, 'rooms', roomId), s => {
      const d = s.data()
      if (d?.nome) setRoomName(d.nome)
      if (d?.status === 'playing') navigate(`/play/${roomId}`)
      if (d?.status === 'finished') navigate('/')
    })
    return u
  }, [roomId])

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'players'), where('roomId', '==', roomId)), s => {
      setPlayerCount(s.size)
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return u
  }, [roomId])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #46178f 0%, #2d0a6b 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Top: room info */}
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
          Sala
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 22, color: '#fff' }}>
          {roomName || roomId}
        </div>
      </div>

      {/* PIN box */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 16px 0' }}>
        <div className="k-pin-box">
          <div className="k-pin-label">PIN do jogo</div>
          <div className="k-pin-num">{roomId.slice(0, 20)}</div>
        </div>
      </div>

      {/* Player avatar + name */}
      <div style={{ textAlign: 'center', padding: '16px 16px 8px' }}>
        <div style={{ fontSize: 56, marginBottom: 8, animation: 'float 3s ease-in-out infinite' }}>{playerAvatar || '🦊'}</div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 24, color: '#fff' }}>
          {playerName || 'Jogador'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
          Você está na sala! 🎉
        </div>
      </div>

      {/* Players joined */}
      <div style={{ flex: 1, padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.1)', borderRadius: 99,
            padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: 18 }}>👥</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{playerCount} jogador{playerCount !== 1 ? 'es' : ''} na sala</span>
          </div>
        </div>

        {/* Animated dots loader */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>
          Aguardando o host iniciar…
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%', background: '#ffdb00',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>

        {/* Players grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxHeight: 200, overflow: 'hidden' }}>
          {players.map(p => (
            <div key={p.id} className="chip" style={{ animation: 'scaleIn .25s ease' }}>
              <span>{p.avatar}</span>
              <span style={{ fontWeight: 700 }}>{p.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
