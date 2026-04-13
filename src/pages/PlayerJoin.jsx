import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useStore } from '../store'
import { TopBar, Logo, AvatarGrid } from '../components/UI'
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
    if (!name.trim()) return toast.error('Digite seu nome 👆')
    if (!user) return toast.error('Aguarde o login…')
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'rooms', roomId))
      if (!snap.exists()) { toast.error('Sala não encontrada ❌'); return }
      const roomData = snap.data()
      if (roomData.status === 'finished') { toast.error('Esta sala já encerrou'); return }

      setPlayerProfile(name.trim(), avatar)

      await setDoc(doc(db, 'players', user.uid), {
        nome: name.trim(),
        avatar,
        score: 0,
        roomId,
        entradoEm: serverTimestamp(),
      })

      navigate(roomData.status === 'playing' ? `/play/${roomId}` : `/wait/${roomId}`)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar
        left={<Logo size="sm" />}
        right={
          <button onClick={() => navigate('/')} className="btn btn-secondary text-sm py-2 px-3" style={{ width: 'auto' }}>
            ← Home
          </button>
        }
      />

      <div className="screen">
        <div className="text-center pt-4 pb-2">
          <div className="text-6xl mb-3 animate-bounce-in">{avatar}</div>
          <h2 className="font-display font-bold text-2xl">Entrar na sala</h2>
          <p className="text-[--muted] text-sm mt-1">
            Sala: <code className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--surface2)' }}>{roomId}</code>
          </p>
        </div>

        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">Como te chamamos?</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enter()}
            placeholder="Seu nome ou apelido…"
            className="input-field"
            maxLength={24}
            autoComplete="given-name"
            autoFocus
          />
        </div>

        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-widest text-[--muted] mb-3">Escolha seu avatar</div>
          <AvatarGrid selected={avatar} onSelect={setAvatar} />
        </div>

        <button onClick={enter} disabled={loading} className="btn btn-primary w-full py-4 text-base font-bold">
          {loading
            ? <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Entrando…</>
            : <><span className="text-xl">🎮</span> Entrar na sala</>}
        </button>
      </div>
    </div>
  )
}
