import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/quiz-rh/', // Necessário para o GitHub Pages encontrar os arquivos na subpasta do repositório
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
