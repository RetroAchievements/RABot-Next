import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/*.config.js",
        "**/*.config.ts",
        "node_modules/**",
        "src/**/*.mock.ts",
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/database/migrate.ts",
        "src/database/schema.ts",
        "src/database/seed-teams.ts",
        "src/deploy-commands.ts",
        "src/index.ts",
        "src/models/**",
        "src/test/**",
      ],
    },
    // Isolate tests to prevent state pollution between tests.
    isolate: true,
    // Clear mocks between tests.
    clearMocks: true,
    // Restore mocks between tests.
    restoreMocks: true,
    // Mock timer functions.
    mockReset: true,
  },
});
