import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useStore } from './store'

import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import AdminCreate from './pages/AdminCreate'
import AdminControl from './pages/AdminControl'
import PlayerJoin from './pages/PlayerJoin'
import PlayerWait from './pages/PlayerWait'
import PlayerGame from './pages/PlayerGame'
import Podium from './pages/Podium'
import Ranking from './pages/Ranking'
import QuizHistory from './pages/QuizHistory'
import QuizTemplates from './pages/QuizTemplates'

export default function App() {
  const setUser = useStore(s => s.setUser)
  const setAccount = useStore(s => s.setAccount)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          const cred = await signInAnonymously(auth)
          setUser(cred.user)
          setAccount(null)
        } catch (e) { console.error('Auth error', e) }
      } else {
        setUser(user)
        
        // If not anonymous, set as account and ensure user exists in Firestore
        if (!user.isAnonymous) {
          // Check if user exists in Firestore
          const userRef = doc(db, 'users', user.uid)
          const userSnap = await getDoc(userRef)
          
          if (!userSnap.exists()) {
            // Create user document if it doesn't exist (for existing users before this update)
            await setDoc(userRef, {
              name: user.displayName || user.email,
              email: user.email,
              createdAt: serverTimestamp(),
            })
          }
          
          // Get name from Firestore (most up-to-date)
          const userData = userSnap.exists() ? userSnap.data() : null
          const displayName = userData?.name || user.displayName || user.email
          
          setAccount({ 
            uid: user.uid, 
            email: user.email, 
            displayName 
          })
        } else {
          setAccount(null)
        }
      }
    })
    return unsub
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<AdminCreate />} />
      <Route path="/templates" element={<QuizTemplates />} />
      <Route path="/room/:roomId/control" element={<AdminControl />} />
      <Route path="/room/:roomId/ranking" element={<Ranking />} />
      <Route path="/room/:roomId/podium" element={<Podium />} />
      <Route path="/join/:roomId" element={<PlayerJoin />} />
      <Route path="/wait/:roomId" element={<PlayerWait />} />
      <Route path="/play/:roomId" element={<PlayerGame />} />
      <Route path="/history" element={<QuizHistory />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
