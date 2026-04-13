import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1c1c3a',
            color: '#f0eeff',
            border: '1px solid #30305a',
            borderRadius: '12px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#00ff88', secondary: '#07071a' },
          },
          error: {
            iconTheme: { primary: '#ff4466', secondary: '#07071a' },
          },
        }}
      />
    </HashRouter>
  </React.StrictMode>
)
