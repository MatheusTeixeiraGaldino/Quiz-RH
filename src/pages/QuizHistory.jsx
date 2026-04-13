import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, Logo } from '../components/UI'

export default function QuizHistory() {
  const navigate = useNavigate()
  const [history] = useState(() => JSON.parse(localStorage.getItem('ql_history') || '[]'))

  const clearHistory = () => {
    localStorage.removeItem('ql_history')
    window.location.reload()
  }

  return (
    <div className="min-h-screen">
      <TopBar
        left={<Logo size="sm" />}
        right={
          <button onClick={() => navigate('/')} className="btn btn-secondary text-sm py-2 px-3" style={{ width: 'auto' }}>← Home</button>
        }
      />

      <div className="screen">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-2xl">📚 Histórico</h2>
          {history.length > 0 && (
            <button onClick={clearHistory} className="btn btn-danger text-xs py-1.5 px-3" style={{ width: 'auto' }}>Limpar</button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-[--muted]">Nenhum quiz criado ainda</p>
            <button onClick={() => navigate('/admin')} className="btn btn-primary mt-4 mx-auto" style={{ width: 'auto', padding: '10px 24px' }}>
              + Criar quiz
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item, i) => (
              <div key={i} className="card hover:border-violet-500/40 cursor-pointer transition-all"
                onClick={() => navigate(`/room/${item.roomId}/control`)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-base">{item.nome}</div>
                    <div className="text-sm text-[--muted] mt-1">
                      {item.totalQuestions} perguntas · {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className="text-[--muted] text-xl">→</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={e => { e.stopPropagation(); navigate(`/room/${item.roomId}/podium`) }}
                    className="btn btn-secondary text-xs py-1.5 px-3" style={{ width: 'auto' }}>
                    🏆 Pódio
                  </button>
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}${location.pathname}#/join/${item.roomId}`); }}
                    className="btn btn-secondary text-xs py-1.5 px-3" style={{ width: 'auto' }}>
                    📋 Copiar link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
