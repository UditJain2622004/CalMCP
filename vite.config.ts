import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

const srcDir = path.resolve(import.meta.dirname, 'src').replace(/\\/g, '/').replace(/^[a-z]:/, m => m.toUpperCase())

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcDir
    }
  }
})

