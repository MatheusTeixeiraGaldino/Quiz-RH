import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useStore = create(
  immer((set, get) => ({
    // Auth
    user: null,
    setUser: (user) => set(s => { s.user = user }),

    // Player session
    playerName: localStorage.getItem('ql_name') || '',
    playerAvatar: localStorage.getItem('ql_avatar') || '🦊',
    playerId: null,

    setPlayerProfile: (name, avatar) => {
      localStorage.setItem('ql_name', name)
      localStorage.setItem('ql_avatar', avatar)
      set(s => { s.playerName = name; s.playerAvatar = avatar })
    },

    // Room
    roomId: null,
    setRoomId: (id) => set(s => { s.roomId = id }),

    // Settings
    soundEnabled: localStorage.getItem('ql_sound') !== 'false',
    darkMode: true,
    toggleSound: () => set(s => {
      s.soundEnabled = !s.soundEnabled
      localStorage.setItem('ql_sound', s.soundEnabled)
    }),
  }))
)
