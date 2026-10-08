/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: { chunkSizeWarningLimit: 700 }, // Recharts alone is ~500 kB minified
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      // Entry points and type-only files have nothing to assert on.
      exclude: ['**/*.test.*', 'src/main.tsx', 'src/test/**', 'src/**/types.ts', 'src/**/viewTypes.ts', 'server/index.ts'],
      reporter: ['text-summary', 'text'],
      // Floors, not targets: they fail the run if coverage regresses.
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
});
