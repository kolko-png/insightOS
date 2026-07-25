import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vitest over Jest: this is an ESM-native Next.js 15 / React 19
 * project, and Vitest needs no transform-config wrestling to handle
 * that combination the way Jest's CJS-first defaults do — faster
 * feedback loop too, since it reuses Vite's dev-server transform
 * pipeline instead of a separate ts-jest compile step.
 *
 * Scope of this test suite, stated plainly: it covers pure,
 * side-effect-free logic (SQL validation, text chunking, forecasting
 * math, condition evaluation) that's genuinely unit-testable without
 * mocking Snowflake/Supabase. It deliberately does NOT include
 * component tests, API route integration tests, or E2E coverage —
 * see the Phase 11 summary for what that next layer would need.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
