import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rolldown no Netlify às vezes não resolve o entry "exports" do lucide-react; força o bundle ESM.
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.mjs'),
    },
  },
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
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase'
            }
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
