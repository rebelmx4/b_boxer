import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/renderer/src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
})