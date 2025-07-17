import { beforeEach, describe, expect, it, mock } from "bun:test";

import { createMockGameExtended } from "../test/mocks/game-data.mock";
import { GameInfoService } from "./game-info.service";

// ... mock the @retroachievements/api module ...
const mockBuildAuthorization = mock(() => ({ username: "RABot", webApiKey: "test-key" }));
const mockGetGameExtended = mock(async (auth, { gameId }) => {
  if (gameId === 14402) {
    return createMockGameExtended();
  }
  if (gameId === 99999) {
    return null;
  }
  throw new Error("API Error");
});

mock.module("@retroachievements/api", () => ({
  buildAuthorization: mockBuildAuthorization,
  getGameExtended: mockGetGameExtended,
}));

describe("Service: GameInfoService", () => {
  beforeEach(() => {
    // ... reset mocks ...
    mockBuildAuthorization.mockClear();
    mockGetGameExtended.mockClear();
  });

  describe("extractGameId", () => {
    it("is defined", () => {
      // ASSERT
      expect(GameInfoService.extractGameId).toBeDefined();
    });

    it("extracts game ID from a numeric string", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("14402");

      // ASSERT
      expect(gameId).toEqual(14402);
    });

    it("extracts game ID from a RetroAchievements URL", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("https://retroachievements.org/game/14402");

      // ASSERT
      expect(gameId).toEqual(14402);
    });

    it("extracts game ID from a RetroAchievements URL with additional path", () => {
      // ACT
      const gameId = GameInfoService.extractGameId(
        "https://retroachievements.org/game/14402/Halo-3",
      );

      // ASSERT
      expect(gameId).toEqual(14402);
    });

    it("handles HTTP URLs", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("http://retroachievements.org/game/14402");

      // ASSERT
      expect(gameId).toEqual(14402);
    });

    it("returns null for invalid numeric strings", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("abc123");

      // ASSERT
      expect(gameId).toBeNull();
    });

    it("returns null for non-game URLs", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("https://retroachievements.org/user/TestUser");

      // ASSERT
      expect(gameId).toBeNull();
    });

    it("returns null for malformed URLs", () => {
      // ACT
      const gameId = GameInfoService.extractGameId("https://retroachievements.org/game/");

      // ASSERT
      expect(gameId).toBeNull();
    });
  });

  describe("fetchGameInfo", () => {
    it("is defined", () => {
      // ASSERT
      expect(GameInfoService.fetchGameInfo).toBeDefined();
    });

    it("fetches game info successfully", async () => {
      // ARRANGE
      const mockGameData = createMockGameExtended();
      mockGetGameExtended.mockResolvedValueOnce(mockGameData);

      // ACT
      const result = await GameInfoService.fetchGameInfo(14402);

      // ASSERT
      expect(mockBuildAuthorization).toHaveBeenCalledWith({
        username: "RABot",
        webApiKey: expect.any(String),
      });
      expect(mockGetGameExtended).toHaveBeenCalledWith(
        { username: "RABot", webApiKey: "test-key" },
        { gameId: 14402 },
      );
      expect(result).toEqual(mockGameData);
    });

    it("returns null when game is not found", async () => {
      // ARRANGE
      mockGetGameExtended.mockResolvedValueOnce(null);

      // ACT
      const result = await GameInfoService.fetchGameInfo(99999);

      // ASSERT
      expect(result).toBeNull();
    });

    it("throws error when API fails", async () => {
      // ARRANGE
      mockGetGameExtended.mockRejectedValueOnce(new Error("API Error"));

      // ACT & ASSERT
      await expect(GameInfoService.fetchGameInfo(88888)).rejects.toThrow("API Error");
    });
  });

  describe("getMostRecentAchievementDate", () => {
    it("is defined", () => {
      // ASSERT
      expect(GameInfoService.getMostRecentAchievementDate).toBeDefined();
    });

    it("returns the most recent achievement date", () => {
      // ARRANGE
      const gameInfo = createMockGameExtended({
        achievements: {
          "1001": {
            id: 1001,
            dateModified: "2023-10-15 12:00:00",
          } as any,
          "1002": {
            id: 1002,
            dateModified: "2023-10-20 14:30:00", // ... most recent ...
          } as any,
          "1003": {
            id: 1003,
            dateModified: "2023-10-10 09:00:00",
          } as any,
        },
      });

      // ACT
      const date = GameInfoService.getMostRecentAchievementDate(gameInfo);

      // ASSERT
      expect(date).toEqual("2023-10-20");
    });

    it("returns empty string when there are no achievements", () => {
      // ARRANGE
      const gameInfo = createMockGameExtended({ achievements: {} });

      // ACT
      const date = GameInfoService.getMostRecentAchievementDate(gameInfo);

      // ASSERT
      expect(date).toEqual("");
    });

    it("returns empty string when achievements is null", () => {
      // ARRANGE
      const gameInfo = createMockGameExtended({ achievements: null as any });

      // ACT
      const date = GameInfoService.getMostRecentAchievementDate(gameInfo);

      // ASSERT
      expect(date).toEqual("");
    });

    it("handles achievements with missing dateModified", () => {
      // ARRANGE
      const gameInfo = createMockGameExtended({
        achievements: {
          "1001": {
            id: 1001,
            dateModified: null,
          } as any,
          "1002": {
            id: 1002,
            dateModified: "2023-10-15 12:00:00",
          } as any,
        },
      });

      // ACT
      const date = GameInfoService.getMostRecentAchievementDate(gameInfo);

      // ASSERT
      expect(date).toEqual("2023-10-15");
    });

    it("handles duplicate dates correctly", () => {
      // ARRANGE
      const gameInfo = createMockGameExtended({
        achievements: {
          "1001": {
            id: 1001,
            dateModified: "2023-10-15 12:00:00",
          } as any,
          "1002": {
            id: 1002,
            dateModified: "2023-10-15 14:30:00", // ... same date, different time ...
          } as any,
        },
      });

      // ACT
      const date = GameInfoService.getMostRecentAchievementDate(gameInfo);

      // ASSERT
      expect(date).toEqual("2023-10-15");
    });
  });
});
