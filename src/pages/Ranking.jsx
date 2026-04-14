import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { RankItem } from '../components/UI'

export default function Ranking() {
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="k-logo">kahoot<span>!</span></span>
        <button onClick={() => history.back()} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Voltar</button>
      </div>

      <div style={{ flex: 1, padding: '16px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 22 }}>📊 Ranking</h2>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 14px', fontWeight: 700 }}>
            👥 {players.length}
          </span>
        </div>

        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.map((p, i) => (
              <RankItem key={p.id} rank={i + 1} player={p} isMe={p.id === playerId} delay={Math.min(i * 35, 300)} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-secondary">🏆 Ver pódio</button>
        </div>
      </div>
    </div>
  )
}
