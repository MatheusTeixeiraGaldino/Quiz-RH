import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'

export default function PlayerWait() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const playerName = useStore(s => s.playerName)
  const playerAvatar = useStore(s => s.playerAvatar)
  const [count, setCount] = useState(0)
  const [players, setPlayers] = useState([])
  const [roomName, setRoomName] = useState('')

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
      setCount(s.size)
      setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return u
  }, [roomId])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.6)', padding: '12px 20px', textAlign: 'center', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 16, textAlign: 'center' }}>
        {/* PIN */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '14px 32px', boxShadow: '0 6px 0 rgba(139,92,246,.2)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#8b5cf6', marginBottom: 4 }}>PIN do jogo</div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, color: '#4c1d95', letterSpacing: 4 }}>{roomId}</div>
        </div>
        {/* Avatar */}
        <div style={{ fontSize: 64, animation: 'float 3s ease-in-out infinite' }}>{playerAvatar || '🦊'}</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#1e1b4b' }}>{playerName || 'Jogador'}</h2>
        <p style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 15 }}>Você está na sala! 🎉</p>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', animation: `pulse 1.2s ease-in-out ${i*.2}s infinite` }} />)}
        </div>
        <div style={{ background: 'rgba(139,92,246,.1)', border: '2px solid rgba(139,92,246,.2)', borderRadius: 99, padding: '6px 18px', fontWeight: 800, color: '#5b21b6', fontSize: 14 }}>
          👥 {count} jogador{count !== 1 ? 'es' : ''} na sala
        </div>
        {/* Players chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
          {players.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 800, color: '#4c1d95', boxShadow: '0 2px 0 rgba(139,92,246,.15)', animation: 'scaleIn .2s ease' }}>
              {p.avatar} {p.nome}
            </div>
          ))}
        </div>
        <p style={{ color: '#6b7280', fontWeight: 600, fontSize: 13, marginTop: 4 }}>Aguardando o host iniciar…</p>
      </div>
    </div>
  )
}
