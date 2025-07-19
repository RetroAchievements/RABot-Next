import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import * as logger from "../utils/logger";
import { DadjokeService } from "./dadjoke.service";

describe("DadjokeService", () => {
  beforeEach(() => {
    // Reset mocks.
    spyOn(logger, "logApiCall").mockImplementation(() => {});
    spyOn(logger, "logError").mockImplementation(() => {});
  });

  describe("fetchRandomJoke", () => {
    it("should return a joke when API call is successful", async () => {
      // Given
      const mockJoke = "Why don't scientists trust atoms? Because they make up everything!";
      const mockResponse = {
        ok: true,
        status: 200,
        json: mock(() => Promise.resolve({ joke: mockJoke })),
      };
      global.fetch = mock(() => Promise.resolve(mockResponse)) as any;

      // When
      const result = await DadjokeService.fetchRandomJoke();

      // Then
      expect(result).toBe(mockJoke);
      expect(fetch).toHaveBeenCalledWith("https://icanhazdadjoke.com/", {
        headers: {
          Accept: "application/json",
          "User-Agent": "RABot Discord Bot (https://github.com/RetroAchievements/RABot)",
        },
      });
    });

    it("should return null when API response is not ok", async () => {
      // Given
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      global.fetch = mock(() => Promise.resolve(mockResponse)) as any;

      // When
      const result = await DadjokeService.fetchRandomJoke();

      // Then
      expect(result).toBeNull();
    });

    it("should return null when fetch throws an error", async () => {
      // Given
      global.fetch = mock(() => Promise.reject(new Error("Network error"))) as any;

      // When
      const result = await DadjokeService.fetchRandomJoke();

      // Then
      expect(result).toBeNull();
    });

    it("should return null when API response has no joke property", async () => {
      // Given
      const mockResponse = {
        ok: true,
        status: 200,
        json: mock(() => Promise.resolve({})),
      };
      global.fetch = mock(() => Promise.resolve(mockResponse)) as any;

      // When
      const result = await DadjokeService.fetchRandomJoke();

      // Then
      expect(result).toBeNull();
    });
  });
});
