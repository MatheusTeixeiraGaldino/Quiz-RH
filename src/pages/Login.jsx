import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useStore } from '../store'
import { AppLogo } from '../components/UI'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const setAccount = useStore(s => s.setAccount)
  const setUser = useStore(s => s.setUser)
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email.trim() || !pass.trim()) return toast.error('Preencha e-mail e senha')
    if (pass.length < 6) return toast.error('Senha mínima: 6 caracteres')
    setLoading(true)
    try {
      let cred
      if (tab === 'login') {
        cred = await signInWithEmailAndPassword(auth, email, pass)
        toast.success('Bem-vindo de volta! 🎉')
      } else {
        cred = await createUserWithEmailAndPassword(auth, email, pass)
        toast.success('Conta criada com sucesso! 🎉')
      }
      setUser(cred.user)
      setAccount({ uid: cred.user.uid, email: cred.user.email })
      navigate('/admin')
    } catch (e) {
      const msgs = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'E-mail já cadastrado',
        'auth/invalid-email': 'E-mail inválido',
        'auth/weak-password': 'Senha muito fraca',
      }
      toast.error(msgs[e.code] || e.message)
    } finally { setLoading(false) }
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
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 36, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 4 }}>
            OL Quiz! ⚡
          </div>
          <p style={{ color: '#6b7280', fontWeight: 700, fontSize: 15 }}>Entre para salvar seus quizzes</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 8px 0 rgba(139,92,246,.15), 0 12px 32px rgba(139,92,246,.08)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f5f3ff', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {[['login','Entrar'],['register','Criar conta']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, transition: 'all .2s',
                  background: tab === t ? '#8b5cf6' : 'transparent',
                  color: tab === t ? '#fff' : '#6b7280',
                  boxShadow: tab === t ? '0 2px 8px rgba(139,92,246,.3)' : 'none',
                }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="lbl" style={{ color: '#4c1d95' }}>E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="seuemail@exemplo.com" className="inp"
                onKeyDown={e => e.key === 'Enter' && handleAuth()} autoFocus />
            </div>
            <div>
              <label className="lbl" style={{ color: '#4c1d95' }}>Senha</label>
              <input value={pass} onChange={e => setPass(e.target.value)} type="password"
                placeholder="••••••" className="inp"
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            </div>

            <button onClick={handleAuth} disabled={loading} className="btn btn-primary" style={{ marginTop: 4, fontSize: 16 }}>
              {loading
                ? <><div className="spinner-sm" style={{ border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', width: 20, height: 20 }} /> Aguarde…</>
                : tab === 'login' ? '🔐 Entrar' : '🚀 Criar conta'
              }
            </button>
          </div>

          <div className="divider-text" style={{ margin: '16px 0' }}>ou</div>

          <button onClick={handleAnon} disabled={loading} className="btn btn-secondary" style={{ color: '#6b7280' }}>
            ⚡ Continuar sem login (quiz rápido)
          </button>
        </div>

        <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ width: '100%', marginTop: 12, color: '#8b5cf6', fontWeight: 800 }}>
          ← Voltar ao início
        </button>
      </div>
    </div>
  )
}
