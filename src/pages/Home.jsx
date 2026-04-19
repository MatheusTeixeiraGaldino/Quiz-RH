import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const account = useStore(s => s.account)

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return toast.error('Digite o PIN da sala')
    if (trimmed.length > 5) return toast.error('PIN tem no máximo 5 caracteres')
    navigate(`/join/${trimmed}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #fce7f3 0%, #ede9fe 50%, #dbeafe 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          OL Quiz! ⚡
        </span>
        {account
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={() => navigate('/profile')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  padding: '6px 12px',
                  background: '#f5f3ff',
                  border: '2px solid #dde3ff',
                  borderRadius: 99,
                  cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#5b21b6',
                  transition: 'all .2s'
                }}
                onMouseEnter={e => { e.target.style.background = '#ede9fe'; e.target.style.borderColor = '#c4b5fd' }}
                onMouseLeave={e => { e.target.style.background = '#f5f3ff'; e.target.style.borderColor = '#dde3ff' }}
              >
                <span>👤</span>
                <span>{account.displayName || account.email}</span>
              </button>
              <button onClick={() => navigate('/admin')} className="btn btn-primary btn-sm" style={{ width: 'auto' }}>
                + Criar quiz
              </button>
            </div>
          : <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/login')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>
                Entrar
              </button>
              <button onClick={() => navigate('/admin')} className="btn btn-primary btn-sm" style={{ width: 'auto' }}>
                Criar quiz
              </button>
            </div>
        }
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 20px 40px', textAlign: 'center', gap: 28 }}>
        <div style={{ animation: 'slideUp .4s ease' }}>
          <div style={{ fontSize: 72, marginBottom: 10, animation: 'float 3s ease-in-out infinite', display: 'block' }}>🎮</div>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 52, lineHeight: 1, marginBottom: 8, letterSpacing: -1, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            OL Quiz!
          </h1>
          <p style={{ color: '#6b7280', fontSize: 17, fontWeight: 700 }}>
            Quiz interativo em tempo real 🚀
          </p>
        </div>

        {/* PIN box */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', width: '100%', maxWidth: 380, boxShadow: '0 8px 0 rgba(139,92,246,.2), 0 12px 32px rgba(139,92,246,.1)', animation: 'slideUp .5s .1s both' }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#8b5cf6', marginBottom: 10 }}>
            🎯 Entre com um PIN
          </div>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5))}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="A1B2C"
            className="pin-input"
            style={{ marginBottom: 12 }}
            maxLength={5}
            autoComplete="off"
          />
          <button onClick={handleJoin} className="btn btn-primary" style={{ fontSize: 17, padding: '14px' }}>
            🎮 Entrar na sala
          </button>
        </div>

        {/* Secondary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 380, animation: 'slideUp .5s .2s both' }}>
          <div className="divider-text">ou</div>
          <button onClick={() => navigate('/admin')} className="btn btn-pink" style={{ fontSize: 16 }}>
            🚀 Criar sala (Admin)
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/templates')} className="btn btn-secondary" style={{ flex: 1 }}>
              📚 Templates
            </button>
            <button onClick={() => navigate('/history')} className="btn btn-secondary" style={{ flex: 1 }}>
              🕓 Histórico
            </button>
          </div>
          {!account && (
            <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ width: '100%', color: '#8b5cf6', fontWeight: 800 }}>
              🔐 Fazer login para salvar quizzes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
