import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react( )],
  base: '/quiz-rh/', // Adicione esta linha com o nome exato do seu repositório
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
