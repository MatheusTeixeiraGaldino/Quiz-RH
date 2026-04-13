import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Logo } from '../components/UI'
import toast from 'react-hot-toast'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const setRoomId = useStore(s => s.setRoomId)

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return toast.error('Digite o código da sala')
    setRoomId(trimmed)
    navigate(`/join/${trimmed}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(104,67,255,0.25) 0%, transparent 70%), var(--bg)',
      }}>

      {/* Hero */}
      <div className="text-center mb-12 animate-slide-up">
        <div className="text-7xl mb-6 animate-float">⚡</div>
        <h1 className="font-display font-black text-6xl mb-4 leading-none tracking-tight"
          style={{ background: 'linear-gradient(135deg, #c4b0ff 0%, #ff2d78 50%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          QuizLive
        </h1>
        <p className="text-[--text2] text-lg max-w-sm mx-auto leading-relaxed">
          Quiz interativo em tempo real para grupos, turmas e eventos
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {/* Admin */}
        <button onClick={() => navigate('/admin')} className="btn btn-primary w-full py-4 text-base">
          <span className="text-xl">🎮</span>
          Criar sala (Admin)
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-[--muted] text-sm">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          ou entre numa sala
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Join */}
        <div className="card gap-3 flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-widest text-[--muted]">Código da sala</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="EX: ABC123"
              className="input-field flex-1 font-display font-bold tracking-widest text-center text-lg"
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
            />
            <button onClick={handleJoin} className="btn btn-primary" style={{ width: 'auto', padding: '11px 20px' }}>
              Entrar
            </button>
          </div>
        </div>

        {/* History */}
        <button onClick={() => navigate('/history')} className="btn btn-secondary w-full">
          <span>📚</span> Histórico de quizzes
        </button>
      </div>

      {/* Footer */}
      <p className="mt-12 text-[--muted] text-xs text-center">
        📱 Escaneie o QR Code ou use o link da sala para entrar
      </p>
    </div>
  )
}
