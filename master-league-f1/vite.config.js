import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acesso de qualquer IP na rede
    port: 5173, // Porta padrão do Vite
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true
  }
})
