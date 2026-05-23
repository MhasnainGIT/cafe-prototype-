import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Default `npm run dev`: HTTP (no cert warning; camera works on localhost).
// `npm run dev:https`: self-signed HTTPS for phone AR over LAN only.
export default defineConfig(({ mode }) => {
  const useHttps = mode === 'https'
  return {
  plugins: useHttps ? [react(), basicSsl()] : [react()],
  server: {
    https: useHttps,
    host: true,
    fs: { allow: ['..'] },
  },
  assetsInclude: ['**/*.glb'],
  }
})
