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
        "node_modules/**",
        "src/test/**",
        "src/**/*.test.ts",
        "src/**/*.mock.ts",
        "**/*.config.ts",
        "src/database/migrate.ts",
        "src/database/seed-teams.ts",
        "src/deploy-commands.ts",
        "src/index.ts",
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