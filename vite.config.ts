import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base + hash routing lets the same build run at a domain root or any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})
