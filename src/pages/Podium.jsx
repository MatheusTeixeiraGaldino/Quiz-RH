import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'

const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_COLORS = ['#fbbf24', '#94a3b8', '#d97706']
const PODIUM_HEIGHTS = [160, 120, 96]

export default function Podium() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const myUid      = useStore(s => s.user?.uid)
  const [players, setPlayers] = useState([])
  const [room,    setRoom]    = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, 'players'), where('roomId', '==', roomId)),
      s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.score||0)-(a.score||0)))
    )
    const { doc, onSnapshot: os } = require('firebase/firestore')
    const u2 = os(doc(db, 'rooms', roomId), s => s.exists() && setRoom(s.data()))
    return () => { u1(); u2() }
  }, [roomId])

  const top3 = players.slice(0, 3)
  const rest = players.slice(3)

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumIdxMap = { 0: 1, 1: 0, 2: 2 } // display position → rank index

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#4f46e5,#7c3aed,#db2777)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,.2)', padding: '12px 18px', textAlign: 'center' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: '#fff' }}>OL Quiz! ⚡</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 32px', maxWidth: 520, margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, animation: 'bounceIn .6s ease' }}>🏆</div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 30, color: '#fff', marginTop: 6 }}>Resultado final!</div>
          {room?.nome && <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 700, marginTop: 2 }}>{room.nome}</div>}
        </div>

        {/* Podium visual */}
        {top3.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
            {podiumOrder.map((p, displayIdx) => {
              const rank = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2 // 2nd, 1st, 3rd
              const trueRank = rank // 0-indexed: 0=1st,1=2nd,2=3rd
              const isMe = p.id === myUid
              const h = PODIUM_HEIGHTS[trueRank]
              return (
                <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 32, animation: trueRank === 0 ? 'bounceIn .6s ease' : 'none' }}>{p.avatar || '🦊'}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: PODIUM_COLORS[trueRank] }}>{(p.score||0).toLocaleString('pt-BR')}</div>
                  <div style={{ width: '100%', height: h, background: `${PODIUM_COLORS[trueRank]}33`, border: `2px solid ${PODIUM_COLORS[trueRank]}88`, borderRadius: '10px 10px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, position: 'relative' }}>
                    <span style={{ fontSize: 28 }}>{MEDALS[trueRank]}</span>
                    {isMe && <span style={{ position: 'absolute', bottom: 6, fontSize: 10, fontWeight: 800, color: '#fbbf24', background: 'rgba(0,0,0,.4)', borderRadius: 99, padding: '2px 7px' }}>VOCÊ</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 4th place and beyond */}
        {rest.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.45)', marginBottom: 10, textAlign: 'center' }}>
              Outros participantes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rest.map((p, i) => {
                const isMe = p.id === myUid
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMe ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.08)', border: `2px solid ${isMe ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.12)'}`, borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: 'rgba(255,255,255,.5)', minWidth: 28 }}>#{i+4}</span>
                    <span style={{ fontSize: 22 }}>{p.avatar || '🦊'}</span>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#fff' }}>{p.nome}{isMe && <span style={{ marginLeft: 6, fontSize: 11, color: '#fbbf24' }}>← você</span>}</span>
                    <span style={{ fontFamily: "'Fredoka One',cursive", color: '#fbbf24', fontSize: 15 }}>{(p.score||0).toLocaleString('pt-BR')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Buttons — SEM Home e SEM Início */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate(`/room/${roomId}/ranking`)}
            className="btn btn-white"
            style={{ fontSize: 16 }}>
            📊 Ver ranking completo
          </button>
          <button
            onClick={() => navigate(`/play/${roomId}`)}
            className="btn"
            style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '2px solid rgba(255,255,255,.25)', fontSize: 15, fontWeight: 800 }}>
            📋 Ver desempenho por questão
          </button>
        </div>
      </div>
    </div>
  )
}
