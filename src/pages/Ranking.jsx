import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { TopBar, Logo, RankItem } from '../components/UI'

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
    <div className="min-h-screen">
      <TopBar
        left={<Logo size="sm" />}
        right={
          <button onClick={() => history.back()} className="btn btn-secondary text-sm py-2 px-3" style={{ width: 'auto' }}>← Voltar</button>
        }
      />

      <div className="screen">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-2xl">📊 Ranking</h2>
          <span className="badge bg-violet-500/10 text-violet-300 border border-violet-500/25">
            👥 {players.length}
          </span>
        </div>

        {players.length === 0 ? (
          <div className="card text-center py-10">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p className="text-[--muted]">Carregando ranking…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((p, i) => (
              <RankItem key={p.id} rank={i + 1} player={p} isMe={p.id === playerId} delay={Math.min(i * 40, 300)} />
            ))}
          </div>
        )}

        <button onClick={() => navigate(`/room/${roomId}/podium`)} className="btn btn-secondary w-full">
          🏆 Ver pódio
        </button>
      </div>
    </div>
  )
}
