import { afterEach, beforeEach, vi } from "vitest";

// Setup test environment for database isolation.
// Each test gets its own database transaction that's rolled back after the test.

// Mock environment variables for testing.
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DISCORD_TOKEN", "test-token");
  vi.stubEnv("DISCORD_APPLICATION_ID", "test-app-id");
  vi.stubEnv("RA_WEB_API_KEY", "test-api-key");
});

// Clean up after each test.
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
