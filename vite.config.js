import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acesso de qualquer IP na rede
    port: 5173, // Porta padrão do Vite
    allowedHosts: [
      'mckenna-metaleptic-daniele.ngrok-free.dev',
      '.ngrok-free.dev', // Permite qualquer subdomínio ngrok
      '.ngrok.io', // Permite domínios ngrok antigos também
      'localhost',
      '127.0.0.1'
    ],
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true
  }
})
