import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/UI'
import toast from 'react-hot-toast'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const handleJoin = () => {
    const trimmed = code.trim()
    if (!trimmed) return toast.error('Digite o PIN da sala')
    navigate(`/join/${trimmed}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #46178f 0%, #2d0a6b 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="k-logo" style={{ fontSize: 28 }}>kahoot<span>!</span></span>
        <button onClick={() => navigate('/admin')} className="btn btn-primary btn-sm" style={{ width: 'auto' }}>
          Criar Quiz
        </button>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: 32 }}>

        <div style={{ animation: 'slideUp .4s ease' }}>
          <div style={{ fontSize: 80, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>⚡</div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 48, color: '#fff', lineHeight: 1, marginBottom: 10, letterSpacing: -1 }}>
            Quiz em Tempo Real
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 500 }}>
            Crie, compartilhe e jogue com qualquer pessoa
          </p>
        </div>

        {/* Enter PIN box — main Kahoot CTA */}
        <div style={{
          background: '#fff', borderRadius: 8, padding: '28px 32px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 8px 0 rgba(0,0,0,0.3)',
          animation: 'slideUp .5s .1s both',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Entre com um PIN
          </div>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="PIN do jogo"
            className="inp-dark"
            style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', letterSpacing: 4, marginBottom: 14 }}
            maxLength={30}
            autoComplete="off"
          />
          <button onClick={handleJoin} className="btn btn-purple" style={{ fontSize: 18, padding: '14px 24px', borderRadius: 8, boxShadow: '0 4px 0 rgba(0,0,0,0.25)' }}>
            Entrar
          </button>
        </div>

        {/* Secondary actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 400, animation: 'slideUp .5s .2s both' }}>
          <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ fontWeight: 700 }}>
            🎮 Criar sala (Admin)
          </button>
          <button onClick={() => navigate('/history')} className="btn btn-secondary" style={{ fontWeight: 700 }}>
            📚 Histórico de quizzes
          </button>
        </div>
      </div>
    </div>
  )
}
