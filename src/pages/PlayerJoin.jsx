// PlayerJoin.jsx
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { AvatarGrid } from '../components/UI'
import toast from 'react-hot-toast'

export default function PlayerJoin() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const playerName = useStore(s => s.playerName)
  const playerAvatar = useStore(s => s.playerAvatar)
  const setPlayerProfile = useStore(s => s.setPlayerProfile)
  const [name, setName] = useState(playerName)
  const [avatar, setAvatar] = useState(playerAvatar || '🦊')
  const [loading, setLoading] = useState(false)

  const enter = async () => {
    if (!name.trim()) return toast.error('Digite seu apelido 👆')
    if (!user) return toast.error('Aguarde…')
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'rooms', roomId))
      if (!snap.exists()) { toast.error('Sala não encontrada ❌'); return }
      const rd = snap.data()
      if (rd.status === 'finished') { toast.error('Sala encerrada'); return }
      setPlayerProfile(name.trim(), avatar)
      await setDoc(doc(db, 'players', user.uid), { nome: name.trim(), avatar, score: 0, roomId, entradoEm: serverTimestamp() })
      navigate(rd.status === 'playing' ? `/play/${roomId}` : `/wait/${roomId}`)
    } catch (e) { toast.error('Erro: ' + e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff' }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Home</button>
      </div>
      <div className="screen">
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{ fontSize: 60, animation: 'float 3s ease-in-out infinite', marginBottom: 8 }}>{avatar}</div>
          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: '#1e1b4b' }}>Entrar na sala!</h2>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, marginTop: 4 }}>
            PIN: <strong style={{ color: '#8b5cf6', fontFamily: "'Fredoka One',cursive", letterSpacing: 2 }}>{roomId}</strong>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Seu apelido</div>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && enter()}
            placeholder="Como te chamamos?" className="inp" style={{ fontSize: 17, fontWeight: 800, textAlign: 'center' }} maxLength={24} autoFocus />
        </div>
        <div className="card">
          <div className="card-title">Escolha seu avatar</div>
          <AvatarGrid selected={avatar} onSelect={setAvatar} />
        </div>
        <button onClick={enter} disabled={loading} className="btn btn-primary" style={{ fontSize: 17, padding: '15px 24px' }}>
          {loading ? <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} /> Entrando…</> : '🎮 Entrar na sala'}
        </button>
      </div>
    </div>
  )
}
