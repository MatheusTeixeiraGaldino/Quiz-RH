import React from 'react'

export function TopBar({ left, right, center }) {
  return (
    <div className="topbar">
      <div className="flex items-center gap-2 min-w-[80px]">{left}</div>
      {center && <div className="flex-1 flex justify-center">{center}</div>}
      <div className="flex items-center gap-2 min-w-[80px] justify-end">{right}</div>
    </div>
  )
}

export function AppLogo({ size = 'md' }) {
  const sz = { sm: '20px', md: '26px', lg: '36px' }[size]
  return (
    <span className="app-logo" style={{ fontSize: sz }}>OL Quiz!</span>
  )
}

export function Spinner({ size = 40 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', border: '4px solid #dde3ff', borderTopColor: '#8b5cf6', animation: 'spin .8s linear infinite', margin: '0 auto' }} />
}

export function Badge({ children, variant = 'purple', className = '' }) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>
}

export function RankItem({ rank, player, isMe, delay = 0 }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const cls = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : ''
  return (
    <div className={`rank-item ${cls} ${isMe ? 'me' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="rank-num">{medals[rank] || rank}</div>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{player.avatar || '🦊'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#fff' }}>
          {player.nome}
          {isMe && <span className="badge badge-yellow ml-2" style={{ fontSize: 10 }}>você</span>}
        </div>
      </div>
      <div className="rank-score">{(player.score || 0).toLocaleString('pt-BR')}</div>
    </div>
  )
}

const AVATARS = ['🦊','🐺','🐸','🦁','🐯','🐻','🐼','🐨','🦅','🦋',
                 '🐙','🦄','🐲','👾','🤖','🎃','🧸','🦖','🦑','🐬',
                 '🦝','🐮','🐷','🐧','🦜','🦩','🦚','🐉','🧟','🥷']

export function AvatarGrid({ selected, onSelect }) {
  return (
    <div className="av-grid">
      {AVATARS.map(a => (
        <div key={a} className={`av ${a === selected ? 'sel' : ''}`} onClick={() => onSelect(a)}>{a}</div>
      ))}
    </div>
  )
}

export const OPT_SHAPES = ['▲', '◆', '●', '■', '★', '✦']
export const OPT_CLS    = ['opt-1','opt-2','opt-3','opt-4','opt-5','opt-6']
export const LABELS     = ['A','B','C','D','E','F']
export const OPT_COLORS = ['#ff4d8d','#3b82f6','#f59e0b','#10b981','#8b5cf6','#f97316']
export { AVATARS }

// Generate a 5-char alphanumeric room code
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
