import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

const AUTH_ERRORS = {
  'auth/user-not-found':        'E-mail não cadastrado',
  'auth/wrong-password':        'Senha incorreta',
  'auth/email-already-in-use':  'Este e-mail já tem conta. Faça login.',
  'auth/invalid-email':         'E-mail inválido',
  'auth/weak-password':         'Senha muito fraca (mínimo 6 caracteres)',
  'auth/invalid-credential':    'E-mail ou senha incorretos',
  'auth/too-many-requests':     'Muitas tentativas. Aguarde e tente novamente.',
  'auth/operation-not-allowed': '⚠️ Login com e-mail não ativado no Firebase. Veja as instruções abaixo.',
  'auth/network-request-failed':'Sem conexão. Verifique sua internet.',
}

export default function Login() {
  const navigate = useNavigate()
  const setAccount = useStore(s => s.setAccount)
  const setUser    = useStore(s => s.setUser)

  const [tab, setTab]       = useState('login')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const handleAuth = async () => {
    if (!email.trim() || !pass.trim()) return toast.error('Preencha e-mail e senha')
    if (pass.length < 6) return toast.error('Senha mínima: 6 caracteres')
    setLoading(true)
    try {
      let cred
      if (tab === 'login') {
        cred = await signInWithEmailAndPassword(auth, email.trim(), pass)
        toast.success('Bem-vindo de volta! 🎉')
      } else {
        cred = await createUserWithEmailAndPassword(auth, email.trim(), pass)
        toast.success('Conta criada! 🎉')
      }
      setUser(cred.user)
      setAccount({ uid: cred.user.uid, email: cred.user.email })
      navigate('/admin')
    } catch (e) {
      const msg = AUTH_ERRORS[e.code] || e.message
      toast.error(msg, { duration: 5000 })
      // Show setup instructions if operation-not-allowed
      if (e.code === 'auth/operation-not-allowed') {
        setShowSetup(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnon = async () => {
    setLoading(true)
    try {
      const cred = await signInAnonymously(auth)
      setUser(cred.user)
      setAccount(null)
      navigate('/admin')
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 38, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 4 }}>
            OL Quiz! ⚡
          </div>
          <p style={{ color: '#6b7280', fontWeight: 700, fontSize: 15 }}>Entre para salvar seus quizzes</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 8px 0 rgba(139,92,246,.15), 0 12px 32px rgba(139,92,246,.08)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f5f3ff', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {[['login','Entrar'], ['register','Criar conta']].map(([t, l]) => (
              <button key={t} onClick={() => { setTab(t); setShowSetup(false) }}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                  cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
                  transition: 'all .2s',
                  background: tab === t ? '#8b5cf6' : 'transparent',
                  color:      tab === t ? '#fff'    : '#6b7280',
                  boxShadow:  tab === t ? '0 2px 8px rgba(139,92,246,.3)' : 'none',
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="lbl" style={{ color: '#4c1d95' }}>E-mail</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="seuemail@exemplo.com"
                className="inp"
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                autoFocus
              />
            </div>
            <div>
              <label className="lbl" style={{ color: '#4c1d95' }}>Senha</label>
              <input
                value={pass}
                onChange={e => setPass(e.target.value)}
                type="password"
                placeholder="••••••"
                className="inp"
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <button onClick={handleAuth} disabled={loading} className="btn btn-primary" style={{ marginTop: 4, fontSize: 16 }}>
              {loading
                ? <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} /> Aguarde…</>
                : tab === 'login' ? '🔐 Entrar' : '🚀 Criar conta'}
            </button>
          </div>

          {/* Firebase setup instructions (shown on operation-not-allowed) */}
          {showSetup && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#fef3c7', borderRadius: 12, border: '2px solid #fbbf24' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 8 }}>
                ⚠️ Ative o login por e-mail no Firebase:
              </div>
              <ol style={{ paddingLeft: 18, fontSize: 13, color: '#78350f', fontWeight: 700, lineHeight: 2 }}>
                <li>Acesse <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6' }}>console.firebase.google.com</a></li>
                <li>Selecione o projeto <strong>quiz-realtime-290ec</strong></li>
                <li>Vá em <strong>Authentication → Sign-in method</strong></li>
                <li>Clique em <strong>E-mail/senha</strong> e ative</li>
                <li>Clique em <strong>Salvar</strong></li>
                <li>Tente criar a conta novamente</li>
              </ol>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ flex: 1, height: 2, background: '#f3f4f6', borderRadius: 99 }} />
            ou
            <div style={{ flex: 1, height: 2, background: '#f3f4f6', borderRadius: 99 }} />
          </div>

          <button onClick={handleAnon} disabled={loading} className="btn btn-secondary" style={{ fontSize: 15, fontWeight: 800 }}>
            ⚡ Quiz rápido sem login
          </button>
        </div>

        <button onClick={() => navigate('/')} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', fontWeight: 800, fontFamily: "'Nunito',sans-serif", fontSize: 14, padding: '8px 0' }}>
          ← Voltar ao início
        </button>
      </div>
    </div>
  )
}
