import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensure GLB models are not caught by SPA fallback
    fs: { allow: ['..'] },
  },
  assetsInclude: ['**/*.glb'],
})
