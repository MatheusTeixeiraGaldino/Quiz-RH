import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export default function Profile() {
  const navigate = useNavigate()
  const user     = useStore(s => s.user)
  const account  = useStore(s => s.account)
  const setAccount = useStore(s => s.setAccount)

  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [initialName, setInitialName] = useState('')

  useEffect(() => {
    if (!user || user.isAnonymous) {
      navigate('/')
      return
    }
    
    // Load current name from Firestore
    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const n = snap.data().name || user.displayName || user.email
          setName(n)
          setInitialName(n)
        } else {
          const n = user.displayName || user.email
          setName(n)
          setInitialName(n)
        }
      } catch (e) {
        console.error(e)
        const n = user.displayName || user.email
        setName(n)
        setInitialName(n)
      }
    }
    loadProfile()
  }, [user])

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Digite um nome')
    if (name.trim() === initialName) return toast.error('Nenhuma alteração feita')
    
    setLoading(true)
    try {
      // Update Auth profile
      await updateProfile(auth.currentUser, { displayName: name.trim() })
      
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
      })
      
      // Update local state
      setAccount({ ...account, displayName: name.trim() })
      setInitialName(name.trim())
      
      toast.success('Nome atualizado! ✅')
    } catch (e) {
      toast.error('Erro ao atualizar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.isAnonymous) return null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fce7f3,#ede9fe,#dbeafe)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255,255,255,.7)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', borderBottom: '2px solid #dde3ff', position: 'sticky', top: 0, zIndex: 200 }}>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, background: 'linear-gradient(135deg,#ff4d8d,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OL Quiz! ⚡</span>
        <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" style={{ width: 'auto' }}>← Voltar</button>
      </div>

      <div className="screen" style={{ maxWidth: 500 }}>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: '#1e1b4b' }}>👤 Meu Perfil</h2>

        <div className="card">
          <div className="card-title">Informações da conta</div>
          
          <div style={{ marginBottom: 12 }}>
            <label className="lbl">E-mail</label>
            <input
              value={account?.email || ''}
              disabled
              className="inp"
              style={{ background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>
              O e-mail não pode ser alterado
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="lbl">Nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              className="inp"
            />
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>
              Este nome aparecerá na lista de usuários para compartilhamento
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || name.trim() === initialName}
            className="btn btn-primary"
            style={{ fontSize: 15 }}>
            {loading
              ? <><div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} /> Salvando…</>
              : '💾 Salvar alterações'}
          </button>
        </div>

        <div className="card">
          <div className="card-title">UID (ID único do Firebase)</div>
          <div style={{ padding: '10px 12px', background: '#f3f4f6', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, color: '#4b5563', wordBreak: 'break-all' }}>
            {user.uid}
          </div>
        </div>
      </div>
    </div>
  )
}
