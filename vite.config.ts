import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  base: process.env.BASE_WEB ?? '/',
  define: { __VERSION_APP__: JSON.stringify(version) },
  plugins: [react()],
  server: { port: 5191, strictPort: true },
  build: { outDir: 'dist' },
})
