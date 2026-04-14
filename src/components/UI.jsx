import React from 'react'

// ── Kahoot TopBar ──────────────────────────────────────────────────────────
export function TopBar({ left, right, center }) {
  return (
    <div className="k-topbar">
      <div className="flex items-center gap-2 min-w-[80px]">{left}</div>
      {center && <div className="flex-1 flex justify-center">{center}</div>}
      <div className="flex items-center gap-2 min-w-[80px] justify-end">{right}</div>
    </div>
  )
}

// ── Kahoot Logo ────────────────────────────────────────────────────────────
export function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }
  return (
    <span className={`k-logo ${sizes[size]}`}>
      kahoot<span>!</span>
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTopColor: '#fff',
      animation: 'spin .8s linear infinite',
      margin: '0 auto',
    }} />
  )
}

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'white', className = '' }) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>
}

// ── Kahoot Rank Item ───────────────────────────────────────────────────────
export function RankItem({ rank, player, isMe, delay = 0, showDelta }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const cls = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : ''
  return (
    <div className={`k-rank-item ${cls} ${isMe ? 'me' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="k-rank-pos">{medals[rank] || rank}</div>
      <div style={{ fontSize: 28, lineHeight: 1 }}>{player.avatar || '🦊'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {player.nome}
          {isMe && <span className="badge badge-yellow ml-2" style={{ fontSize: 10 }}>você</span>}
        </div>
      </div>
      <div className="k-rank-score">{(player.score || 0).toLocaleString('pt-BR')}</div>
    </div>
  )
}

// ── Timer Circle + Bar ─────────────────────────────────────────────────────
export function KahootTimer({ value, max }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const warn = value <= 5
  return (
    <div className="k-timer-wrap">
      <div className={`k-timer-circle ${warn ? 'warn' : ''}`}>{value}</div>
      <div className="k-timer-bar-wrap" style={{ width: '100%' }}>
        <div className={`k-timer-bar ${warn ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Answer option icons (Kahoot shapes) ────────────────────────────────────
export const OPT_ICONS = ['▲', '◆', '●', '■', '★', '✦']
export const OPT_COLORS_CSS = ['opt-red', 'opt-blue', 'opt-yellow', 'opt-green', 'opt-red', 'opt-blue']
export const OPT_ICON_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
export const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

// ── Avatar Grid ────────────────────────────────────────────────────────────
const AVATARS = ['🦊','🐺','🐸','🦁','🐯','🐻','🐼','🐨','🦅','🦋',
                 '🐙','🦄','🐲','👾','🤖','🎃','🧸','🦖','🦑','🐬',
                 '🦝','🐮','🐷','🐧','🦜','🦩','🦚','🐉','🧟','🥷']

export function AvatarGrid({ selected, onSelect }) {
  return (
    <div className="av-grid">
      {AVATARS.map(a => (
        <div key={a} className={`av ${a === selected ? 'sel' : ''}`} onClick={() => onSelect(a)}>
          {a}
        </div>
      ))}
    </div>
  )
}

export { AVATARS }
