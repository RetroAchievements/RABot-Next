import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { YouTubeService } from "../services/youtube.service";
import { createMockMessage } from "../test/mocks/discord.mock";
import { createMockGameExtended } from "../test/mocks/game-data.mock";
import { MESSAGES } from "../utils/messages";
import ganCommand from "./gan.command";

describe("Command: gan", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("shows error message when no arguments provided", async () => {
      // ACT
      await ganCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(MESSAGES.GAN_USAGE_EXAMPLE);
    });

    it("shows error message for invalid game ID format", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() };
      mockMessage.reply = vi.fn().mockResolvedValue(sentMsg);

      // ACT
      await ganCommand.execute(mockMessage, ["invalid"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(MESSAGES.GETTING_GAME_INFO("invalid"));
      expect(sentMsg.edit).toHaveBeenCalledWith(MESSAGES.INVALID_GAME_ID_DETAILED);
    });

    it("shows error when game info cannot be fetched", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() };
      mockMessage.reply = vi.fn().mockResolvedValue(sentMsg);
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(null);

      // ACT
      await ganCommand.execute(mockMessage, ["4650"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(MESSAGES.GETTING_GAME_INFO("4650"));
      expect(sentMsg.edit).toHaveBeenCalledWith(MESSAGES.UNABLE_TO_GET_GAME_INFO("4650"));
    });

    it("generates template successfully", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() };
      mockMessage.reply = vi.fn().mockResolvedValue(sentMsg);

      const mockGameInfo = createMockGameExtended({
        title: "Super Mario Bros.",
        consoleName: "NES",
      });
      const mockDate = "2023-01-15";
      const mockYoutubeLink = "https://youtube.com/watch?v=example";
      const mockTemplate = "**Game:** Super Mario Bros.\n**Console:** NES\n**Date:** 2023-01-15";

      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(mockGameInfo);
      vi.spyOn(GameInfoService, "getMostRecentAchievementDate").mockReturnValue(mockDate);
      vi.spyOn(YouTubeService, "searchLongplay").mockResolvedValue(mockYoutubeLink);
      vi.spyOn(TemplateService, "generateGanTemplate").mockReturnValue(mockTemplate);

      // ACT
      await ganCommand.execute(mockMessage, ["4650"], {} as any);

      // ASSERT
      expect(GameInfoService.extractGameId).toHaveBeenCalledWith("4650");
      expect(GameInfoService.fetchGameInfo).toHaveBeenCalledWith(4650);
      expect(GameInfoService.getMostRecentAchievementDate).toHaveBeenCalledWith(mockGameInfo);
      expect(YouTubeService.searchLongplay).toHaveBeenCalledWith("Super Mario Bros.", "NES");
      expect(TemplateService.generateGanTemplate).toHaveBeenCalledWith(
        mockGameInfo,
        mockDate,
        mockYoutubeLink,
        4650,
      );
      expect(sentMsg.edit).toHaveBeenCalledWith(
        `${mockMessage.author}, here's your achievement-news post template:\n${mockTemplate}`,
      );
    });

    it("handles API errors gracefully", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() };
      mockMessage.reply = vi.fn().mockResolvedValue(sentMsg);
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockRejectedValue(new Error("API Error"));

      // ACT
      await ganCommand.execute(mockMessage, ["4650"], {} as any);

      // ASSERT
      expect(sentMsg.edit).toHaveBeenCalledWith(MESSAGES.UNABLE_TO_GET_GAME_INFO("4650"));
    });

    it("handles URL input correctly", async () => {
      // ARRANGE
      const gameUrl = "https://retroachievements.org/game/4650";
      const sentMsg = { edit: vi.fn() };
      mockMessage.reply = vi.fn().mockResolvedValue(sentMsg);

      const mockGameInfo = createMockGameExtended({
        title: "Test Game",
        consoleName: "Test Console",
      });
      const mockTemplate = "Test template";

      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(mockGameInfo);
      vi.spyOn(GameInfoService, "getMostRecentAchievementDate").mockReturnValue("2023-01-01");
      vi.spyOn(YouTubeService, "searchLongplay").mockResolvedValue(null);
      vi.spyOn(TemplateService, "generateGanTemplate").mockReturnValue(mockTemplate);

      // ACT
      await ganCommand.execute(mockMessage, [gameUrl], {} as any);

      // ASSERT
      expect(GameInfoService.extractGameId).toHaveBeenCalledWith(gameUrl);
    });
  });
});
