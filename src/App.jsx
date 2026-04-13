import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'

// Pages
import Home from './pages/Home'
import AdminCreate from './pages/AdminCreate'
import AdminControl from './pages/AdminControl'
import PlayerJoin from './pages/PlayerJoin'
import PlayerWait from './pages/PlayerWait'
import PlayerGame from './pages/PlayerGame'
import Podium from './pages/Podium'
import Ranking from './pages/Ranking'
import QuizHistory from './pages/QuizHistory'

export default function App() {
  const setUser = useStore(s => s.setUser)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        try {
          const cred = await signInAnonymously(auth)
          setUser(cred.user)
        } catch (e) {
          console.error('Auth error', e)
        }
      } else {
        setUser(user)
      }
    })
    return unsub
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminCreate />} />
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
