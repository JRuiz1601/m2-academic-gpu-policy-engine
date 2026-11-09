import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      // Core domain logic must keep branch coverage at or above 90 %.
      thresholds: { 'src/domain/**': { branches: 90 } },
    },
  },
});
