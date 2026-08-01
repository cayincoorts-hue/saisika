/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const runtimeMode = env.VITE_APP_MODE || 'app'

  return {
    plugins: [react()],
    build: {
      outDir: runtimeMode === 'demo' ? 'dist-demo' : '../backend/static',
      emptyOutDir: true,
    },
    server: {
      open: true,
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
