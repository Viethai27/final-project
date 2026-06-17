import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/modules/dispatch/**', 'src/modules/queue/**'],
      exclude: [
        '**/__tests__/**',
        '**/build/**',
        '**/dist/**',
      ],
    },
  },
});