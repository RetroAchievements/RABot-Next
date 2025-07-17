import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import * as logger from "../utils/logger";
import { YouTubeService } from "./youtube.service";

// ... mock the youtube-search module ...
const mockYtSearch = mock(async (searchTerms, _opts) => {
  if (searchTerms.includes("error game")) {
    throw new Error("YouTube API Error");
  }
  if (searchTerms.includes("no results")) {
    return { results: [] };
  }

  return {
    results: [
      {
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Test Game Longplay",
        description: "A longplay of Test Game",
      },
    ],
  };
});

mock.module("youtube-search", () => ({
  default: mockYtSearch,
}));

// ... mock constants ...
mock.module("../config/constants", () => ({
  YOUTUBE_API_KEY: "test-youtube-api-key",
}));

describe("Service: YouTubeService", () => {
  beforeEach(() => {
    // ... reset mocks ...
    mockYtSearch.mockClear();
    spyOn(logger, "logError").mockImplementation(() => {});
  });

  describe("searchLongplay", () => {
    it("is defined", () => {
      // ASSERT
      expect(YouTubeService.searchLongplay).toBeDefined();
    });

    it("returns a YouTube URL when a longplay is found", async () => {
      // ARRANGE
      const gameTitle = "Super Mario 64";
      const consoleName = "Nintendo 64";

      // ACT
      const result = await YouTubeService.searchLongplay(gameTitle, consoleName);

      // ASSERT
      expect(mockYtSearch).toHaveBeenCalledWith("longplay Super Mario 64 Nintendo 64", {
        maxResults: 1,
        key: "test-youtube-api-key",
      });
      expect(result).toEqual("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });

    it("removes special characters like ~ from the game title", async () => {
      // ARRANGE
      const gameTitle = "~Hack~ Super Mario World";
      const consoleName = "SNES";

      // ACT
      await YouTubeService.searchLongplay(gameTitle, consoleName);

      // ASSERT
      expect(mockYtSearch).toHaveBeenCalledWith(
        "longplay Hack Super Mario World SNES",
        expect.any(Object),
      );
    });

    it("returns null when no results are found", async () => {
      // ARRANGE
      const gameTitle = "no results game";
      const consoleName = "console";

      // ACT
      const result = await YouTubeService.searchLongplay(gameTitle, consoleName);

      // ASSERT
      expect(result).toBeNull();
    });

    it("returns null when results array is empty", async () => {
      // ARRANGE
      mockYtSearch.mockResolvedValueOnce({ results: [] });

      // ACT
      const result = await YouTubeService.searchLongplay("game", "console");

      // ASSERT
      expect(result).toBeNull();
    });

    it("returns null when result has no link", async () => {
      // ARRANGE
      mockYtSearch.mockResolvedValueOnce({
        results: [
          {
            link: undefined,
            title: "Test Game Longplay",
            description: "A longplay",
          } as any,
        ],
      });

      // ACT
      const result = await YouTubeService.searchLongplay("game", "console");

      // ASSERT
      expect(result).toBeNull();
    });

    it("handles API errors gracefully", async () => {
      // ARRANGE
      const gameTitle = "error game";
      const consoleName = "console";

      // ACT
      const result = await YouTubeService.searchLongplay(gameTitle, consoleName);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith("Error searching YouTube:", {
        error: expect.any(Error),
      });
      expect(result).toBeNull();
    });

    it("returns null when YOUTUBE_API_KEY is not set", async () => {
      // ARRANGE
      // ... temporarily mock the constants module without API key ...
      mock.module("../config/constants", () => ({
        YOUTUBE_API_KEY: undefined,
      }));

      // ... need to re-import to get the new mock ...
      const { YouTubeService: YTServiceNoKey } = await import("./youtube.service");

      // ACT
      const result = await YTServiceNoKey.searchLongplay("game", "console");

      // ASSERT
      expect(mockYtSearch).not.toHaveBeenCalled();
      expect(result).toBeNull();

      // ... restore the original mock ...
      mock.module("../config/constants", () => ({
        YOUTUBE_API_KEY: "test-youtube-api-key",
      }));
    });
  });
});
