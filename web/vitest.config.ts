import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    watch: false,
    coverage: {
      enabled: true,
      provider: 'v8',
      all: true,
      thresholds: { 
        lines: 95, 
        functions: 95, 
        branches: 95, 
        statements: 95 
      },
      reportsDirectory: './coverage',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
