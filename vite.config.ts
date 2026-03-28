import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/port/',
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.exr'],
  build: { outDir: 'docs' },
})
