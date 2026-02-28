import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as logger from "../utils/logger";
import { DadjokeService } from "./dadjoke.service";

describe("DadjokeService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.spyOn(logger, "logApiCall").mockImplementation(() => {});
    vi.spyOn(logger, "logError").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("fetchRandomJoke", () => {
    it("should return a joke when API call is successful", async () => {
      // ARRANGE
      const mockJoke = "Why don't scientists trust atoms? Because they make up everything!";
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(() => Promise.resolve({ joke: mockJoke })),
      };
      global.fetch = vi.fn(() => Promise.resolve(mockResponse)) as any;

      // ACT
      const result = await DadjokeService.fetchRandomJoke();

      // ASSERT
      expect(result).toBe(mockJoke);
      expect(fetch).toHaveBeenCalledWith("https://icanhazdadjoke.com/", {
        headers: {
          Accept: "application/json",
          "User-Agent": "RABot Discord Bot (https://github.com/RetroAchievements/RABot)",
        },
      });
    });

    it("should return null when API response is not ok", async () => {
      // ARRANGE
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      global.fetch = vi.fn(() => Promise.resolve(mockResponse)) as any;

      // ACT
      const result = await DadjokeService.fetchRandomJoke();

      // ASSERT
      expect(result).toBeNull();
    });

    it("should return null when fetch throws an error", async () => {
      // ARRANGE
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as any;

      // ACT
      const result = await DadjokeService.fetchRandomJoke();

      // ASSERT
      expect(result).toBeNull();
    });

    it("should return null when API response has no joke property", async () => {
      // ARRANGE
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(() => Promise.resolve({})),
      };
      global.fetch = vi.fn(() => Promise.resolve(mockResponse)) as any;

      // ACT
      const result = await DadjokeService.fetchRandomJoke();

      // ASSERT
      expect(result).toBeNull();
    });
  });
});
