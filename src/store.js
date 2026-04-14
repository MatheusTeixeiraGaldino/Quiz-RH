import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useStore = create(
  immer((set) => ({
    // Firebase anonymous user
    user: null,
    setUser: (user) => set(s => { s.user = user }),

    // Logged-in account (email/password)
    account: null,
    setAccount: (account) => set(s => { s.account = account }),

    // Player session
    playerName: localStorage.getItem('ql_name') || '',
    playerAvatar: localStorage.getItem('ql_avatar') || '🦊',

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
    toggleSound: () => set(s => {
      s.soundEnabled = !s.soundEnabled
      localStorage.setItem('ql_sound', String(s.soundEnabled))
    }),
  }))
)
