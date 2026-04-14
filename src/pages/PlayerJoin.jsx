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
    if (!user) return toast.error('Aguarde o login…')
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'rooms', roomId))
      if (!snap.exists()) { toast.error('Sala não encontrada ❌'); return }
      const rd = snap.data()
      if (rd.status === 'finished') { toast.error('Esta sala já encerrou'); return }
      setPlayerProfile(name.trim(), avatar)
      await setDoc(doc(db, 'players', user.uid), { nome: name.trim(), avatar, score: 0, roomId, entradoEm: serverTimestamp() })
      navigate(rd.status === 'playing' ? `/play/${roomId}` : `/wait/${roomId}`)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#46178f,#2d0a6b)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="k-logo">kahoot<span>!</span></span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Home</button>
      </div>

      <div className="screen" style={{ flex: 1, alignItems: 'stretch' }}>
        {/* Avatar preview */}
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{ fontSize: 64, animation: 'float 3s ease-in-out infinite', marginBottom: 8 }}>{avatar}</div>
          <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 22 }}>Entrar na sala</h2>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
            PIN: <strong style={{ color: '#ffdb00' }}>{roomId}</strong>
          </div>
        </div>

        {/* Name */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            Seu apelido
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enter()}
            placeholder="Como te chamamos?"
            className="inp"
            style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}
            maxLength={24}
            autoFocus
          />
        </div>

        {/* Avatar grid */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
            Escolha seu avatar
          </div>
          <AvatarGrid selected={avatar} onSelect={setAvatar} />
        </div>

        <button onClick={enter} disabled={loading} className="btn btn-primary" style={{ padding: '16px 24px', fontSize: 18, boxShadow: '0 6px 0 rgba(0,0,0,0.3)' }}>
          {loading
            ? <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(104,67,255,.3)', borderTopColor: 'var(--kahoot-purple)', animation: 'spin .8s linear infinite' }} /> Entrando…</>
            : '🎮 Entrar na sala'}
        </button>
      </div>
    </div>
  )
}
