import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GithubReleaseService } from "./github-release.service";

describe("GithubReleaseService", () => {
  beforeEach(() => {
    // Reset cache before each test
    // @ts-expect-error - Accessing private property for testing
    GithubReleaseService.cachedVersion = null;
    // @ts-expect-error - Accessing private property for testing
    GithubReleaseService.cacheTimestamp = 0;
  });

  afterEach(() => {
    global.fetch = fetch;
  });

  describe("fetchLatestVersion", () => {
    it("should fetch and return the version tag from GitHub API", async () => {
      // ARRANGE
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn(() => Promise.resolve({ tag_name: "2.0.1" })),
        }),
      );
      // @ts-expect-error - global.fetch is assignable
      global.fetch = mockFetch;

      // ACT
      const version = await GithubReleaseService.fetchLatestVersion();

      // ASSERT
      expect(version).toBe("2.0.1");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/RetroAchievements/RABot-Next/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RABot Discord Bot (https://github.com/RetroAchievements/RABot-Next)",
          },
        },
      );
    });

    it("should return null when API returns non-ok status", async () => {
      // ARRANGE
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );
      // @ts-expect-error - global.fetch is assignable
      global.fetch = mockFetch;

      // ACT
      const version = await GithubReleaseService.fetchLatestVersion();

      // ASSERT
      expect(version).toBeNull();
    });

    it("should return null when fetch throws an error", async () => {
      // ARRANGE
      const mockFetch = vi.fn(() => Promise.reject(new Error("Network error")));
      // @ts-expect-error - global.fetch is assignable
      global.fetch = mockFetch;

      // ACT
      const version = await GithubReleaseService.fetchLatestVersion();

      // ASSERT
      expect(version).toBeNull();
    });

    it("should return cached version within cache duration", async () => {
      // ARRANGE
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn(() => Promise.resolve({ tag_name: "2.0.1" })),
        }),
      );
      // @ts-expect-error - global.fetch is assignable
      global.fetch = mockFetch;

      // ACT
      const version1 = await GithubReleaseService.fetchLatestVersion();
      const version2 = await GithubReleaseService.fetchLatestVersion();

      // ASSERT
      expect(version1).toBe("2.0.1");
      expect(version2).toBe("2.0.1");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should refetch after cache expires", async () => {
      // ARRANGE
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn(() => Promise.resolve({ tag_name: "2.0.1" })),
        }),
      );
      // @ts-expect-error - global.fetch is assignable
      global.fetch = mockFetch;
      await GithubReleaseService.fetchLatestVersion();
      // @ts-expect-error - Accessing private property for testing
      GithubReleaseService.cacheTimestamp = Date.now() - (60 * 1000 + 1);

      // ACT
      await GithubReleaseService.fetchLatestVersion();

      // ASSERT
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
