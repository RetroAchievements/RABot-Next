import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { YouTubeService } from "../services/youtube.service";
import { createMockInteraction } from "../test/mocks/discord.mock";
import { createMockGameExtended } from "../test/mocks/game-data.mock";
import { MESSAGES } from "../utils/messages";
import ganSlashCommand from "./gan.command";

describe("SlashCommand: gan", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "gan",
      options: {
        getString: vi.fn(() => "4650"),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("shows error message for invalid game ID format", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn(() => "invalid");
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(null);

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.options.getString).toHaveBeenCalledWith("game-id", true);
      expect(GameInfoService.extractGameId).toHaveBeenCalledWith("invalid");
      expect(mockInteraction.editReply).toHaveBeenCalledWith(MESSAGES.INVALID_GAME_ID_DETAILED);
    });

    it("shows error when game info cannot be fetched", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn(() => "4650");
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(null);

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        MESSAGES.UNABLE_TO_GET_GAME_INFO("4650"),
      );
    });

    it("generates template successfully", async () => {
      // ARRANGE
      const mockGameInfo = createMockGameExtended({
        title: "Super Mario Bros.",
        consoleName: "NES",
      });
      const mockDate = "2023-01-15";
      const mockYoutubeLink = "https://youtube.com/watch?v=example";
      const mockTemplate = "**Game:** Super Mario Bros.\n**Console:** NES\n**Date:** 2023-01-15";

      mockInteraction.options.getString = vi.fn(() => "4650");
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(mockGameInfo);
      vi.spyOn(GameInfoService, "getMostRecentAchievementDate").mockReturnValue(mockDate);
      vi.spyOn(YouTubeService, "searchLongplay").mockResolvedValue(mockYoutubeLink);
      vi.spyOn(TemplateService, "generateGanTemplate").mockReturnValue(mockTemplate);

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalled();
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
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: `Here's your achievement-news post template:\n${mockTemplate}`,
      });
    });

    it("handles API errors gracefully", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn(() => "4650");
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockRejectedValue(new Error("API Error"));

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        MESSAGES.UNABLE_TO_GET_GAME_INFO("4650"),
      );
    });

    it("handles URL input correctly", async () => {
      // ARRANGE
      const gameUrl = "https://retroachievements.org/game/4650";
      mockInteraction.options.getString = vi.fn(() => gameUrl);
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(4650);

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.options.getString).toHaveBeenCalledWith("game-id", true);
      expect(GameInfoService.extractGameId).toHaveBeenCalledWith(gameUrl);
    });

    it("retrieves required game-id option", async () => {
      // ARRANGE
      const mockGameInfo = createMockGameExtended({
        title: "Test Game",
        consoleName: "Test Console",
      });

      mockInteraction.options.getString = vi.fn(() => "12345");
      vi.spyOn(GameInfoService, "extractGameId").mockReturnValue(12345);
      vi.spyOn(GameInfoService, "fetchGameInfo").mockResolvedValue(mockGameInfo);
      vi.spyOn(GameInfoService, "getMostRecentAchievementDate").mockReturnValue("2023-01-01");
      vi.spyOn(YouTubeService, "searchLongplay").mockResolvedValue(null);
      vi.spyOn(TemplateService, "generateGanTemplate").mockReturnValue("template");

      // ACT
      await ganSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.options.getString).toHaveBeenCalledWith("game-id", true);
    });
  });
});
