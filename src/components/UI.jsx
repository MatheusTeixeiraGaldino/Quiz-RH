import React from 'react'

// ── TopBar ─────────────────────────────────────────────────────────────────
export function TopBar({ left, right, center }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        background: 'rgba(7,7,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
      <div className="flex items-center gap-2 min-w-[80px]">{left}</div>
      {center && <div className="flex-1 flex justify-center">{center}</div>}
      <div className="flex items-center gap-2 min-w-[80px] justify-end">{right}</div>
    </div>
  )
}

// ── Logo ───────────────────────────────────────────────────────────────────
export function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  return (
    <span className={`font-display font-bold tracking-tight ${sizes[size]}`}
      style={{ background: 'linear-gradient(135deg, #9b6bff, #ff2d78)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
      ⚡ QuizLive
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid var(--border2)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto',
    }} />
  )
}

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'purple', className = '' }) {
  const variants = {
    purple: 'bg-violet-500/10 text-violet-300 border border-violet-500/25',
    green: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border border-red-500/20',
    yellow: 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/20',
    pink: 'bg-pink-500/10 text-pink-300 border border-pink-500/20',
    blue: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20',
    live: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  }
  return (
    <span className={`badge ${variants[variant]} ${className}`} style={variant === 'live' ? { animation: 'glow 2s infinite' } : {}}>
      {children}
    </span>
  )
}

// ── PlayerChip ─────────────────────────────────────────────────────────────
export function PlayerChip({ avatar, name }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm animate-scale-in"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <span>{avatar}</span>
      <span className="font-medium">{name}</span>
    </div>
  )
}

// ── RankItem ───────────────────────────────────────────────────────────────
export function RankItem({ rank, player, isMe, delay = 0 }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const cls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : ''

  return (
    <div className={`rank-item ${cls} ${isMe ? 'me' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="font-display font-black text-lg min-w-[36px] text-center">
        {medals[rank] || rank}
      </div>
      <div className="text-2xl">{player.avatar || '🦊'}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {player.nome}
          {isMe && <span className="ml-2 badge bg-violet-500/10 text-violet-300 border border-violet-500/25 text-[10px]">você</span>}
        </div>
      </div>
      <div className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
        {(player.score || 0).toLocaleString('pt-BR')}
      </div>
    </div>
  )
}

// ── ProgressDots ───────────────────────────────────────────────────────────
export function ProgressDots({ total, current }) {
  return (
    <div className="dot-progress">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`dot ${i < current ? 'done' : i === current ? 'current' : ''}`} />
      ))}
    </div>
  )
}

// ── TimerBar ───────────────────────────────────────────────────────────────
export function TimerBar({ value, max, warning }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="timer-bar">
      <div className={`timer-fill ${warning ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="card w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">{title}</h3>
            <button onClick={onClose} className="text-[--muted] hover:text-[--text] transition-colors text-xl">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── AvatarGrid ─────────────────────────────────────────────────────────────
const AVATARS = ['🦊','🐺','🐸','🦁','🐯','🐻','🐼','🐨','🦅','🦋',
                 '🐙','🦄','🐲','👾','🤖','🎃','🧸','🦖','🦑','🐬',
                 '🦝','🐮','🐷','🐧','🦜','🦩','🦚','🐉','🧟','🥷']

export function AvatarGrid({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATARS.map(a => (
        <button key={a}
          onClick={() => onSelect(a)}
          className={`aspect-square rounded-full text-2xl flex items-center justify-center transition-all duration-200 ${
            a === selected
              ? 'scale-110 ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0e0e26]'
              : 'hover:scale-110 hover:ring-1 hover:ring-violet-500/50'
          }`}
          style={{ background: a === selected ? 'rgba(104,67,255,0.2)' : 'var(--surface2)' }}>
          {a}
        </button>
      ))}
    </div>
  )
}

// ── AnswerBar ──────────────────────────────────────────────────────────────
export function AnswerBar({ answered, total }) {
  const pct = total ? Math.round((answered / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <span className="text-xl">✍️</span>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs text-[--muted] font-medium">Respostas recebidas</span>
          <span className="font-display font-bold text-base">
            <span style={{ color: 'var(--accent)' }}>{answered}</span>
            <span className="text-[--muted]"> / {total}</span>
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  )
}

export { AVATARS }
