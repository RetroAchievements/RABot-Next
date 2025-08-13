import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { Message } from "discord.js";
import * as ra from "@retroachievements/api";

import { connectApiService } from "../services/connect-api.service";
import { createMockMessage } from "../test/mocks/discord.mock";
import memCommand from "./mem.command";

// Mock the @retroachievements/api module
vi.mock("@retroachievements/api", () => {
  return {
    getAchievementUnlocks: vi.fn(),
    buildAuthorization: vi.fn().mockReturnValue({ username: "RABot", webApiKey: "test" }),
  };
});

describe("Command: mem", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;
  const mockGetAchievementUnlocks = vi.mocked(ra.getAchievementUnlocks);
  const mockBuildAuthorization = vi.mocked(ra.buildAuthorization);

  beforeEach(() => {
    mockMessage = createMockMessage();
    mockGetAchievementUnlocks.mockReset();
    mockBuildAuthorization.mockClear();
    mockBuildAuthorization.mockReturnValue({ username: "RABot", webApiKey: "test" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    // ASSERT
    expect(memCommand).toBeDefined();
    expect(memCommand.name).toBe("parsemem");
    expect(memCommand.aliases).toContain("mem");
    expect(memCommand.category).toBe("retroachievements");
  });

  describe("execute", () => {
    it("shows error message when no arguments provided", async () => {
      // ACT
      await memCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Please provide an achievement ID, URL, or MemAddr string.",
      );
    });

    it("parses valid MemAddr string", async () => {
      // ACT
      await memCommand.execute(mockMessage, ["0xH1234=5"], {} as any);

      // ASSERT
      const replyMock = mockMessage.reply as Mock<(content: string) => Promise<Message>>;
      expect(replyMock.mock.calls.length).toBeGreaterThan(0);
      const reply = replyMock.mock.calls[0]![0] as string;
      expect(reply).toContain("__**Core Group**__:");
      expect(reply).toContain("Mem");
      expect(reply).toContain("8-bit");
      expect(reply).toContain("0x001234");
    });

    it("shows error message for invalid MemAddr string", async () => {
      // ACT
      await memCommand.execute(mockMessage, ["@#$%"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("**Whoops!**"));
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("Check your MemAddr string and try again"),
      );
    });

    it("processes achievement ID successfully", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() } as unknown as Message;
      (mockMessage.reply as Mock<() => Promise<Message>>).mockResolvedValueOnce(sentMsg);

      mockGetAchievementUnlocks.mockResolvedValueOnce({
        game: { id: 789 },
      });

      vi.spyOn(connectApiService, "getMemAddr").mockResolvedValueOnce("0xH1234=5");

      // ACT
      await memCommand.execute(mockMessage, ["123456"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        ":hourglass: Getting MemAddr for achievement ID **123456**, please wait...",
      );
      expect(sentMsg.edit).toHaveBeenCalledWith(expect.stringContaining("__**Core Group**__:"));
    });

    it("processes achievement URL successfully", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() } as unknown as Message;
      (mockMessage.reply as Mock<() => Promise<Message>>).mockResolvedValueOnce(sentMsg);

      mockGetAchievementUnlocks.mockResolvedValueOnce({
        game: { id: 789 },
      });

      vi.spyOn(connectApiService, "getMemAddr").mockResolvedValueOnce("0xH1234=5");

      // ACT
      await memCommand.execute(
        mockMessage,
        ["https://retroachievements.org/achievement/123456"],
        {} as any,
      );

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        ":hourglass: Getting MemAddr for achievement ID **123456**, please wait...",
      );
      expect(sentMsg.edit).toHaveBeenCalledWith(expect.stringContaining("__**Core Group**__:"));
    });

    it("shows error message when game ID not found", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() } as unknown as Message;
      (mockMessage.reply as Mock<() => Promise<Message>>).mockResolvedValueOnce(sentMsg);

      mockGetAchievementUnlocks.mockResolvedValueOnce({});

      // ACT
      await memCommand.execute(mockMessage, ["123456"], {} as any);

      // ASSERT
      expect(sentMsg.edit).toHaveBeenCalledWith(
        "**Whoops!**\nI didn't find the game ID for achievement ID **123456**.",
      );
    });

    it("shows error message when MemAddr not found", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() } as unknown as Message;
      (mockMessage.reply as Mock<() => Promise<Message>>).mockResolvedValueOnce(sentMsg);

      mockGetAchievementUnlocks.mockResolvedValueOnce({
        game: { id: 789 },
      });

      vi.spyOn(connectApiService, "getMemAddr").mockResolvedValueOnce(null);

      // ACT
      await memCommand.execute(mockMessage, ["123456"], {} as any);

      // ASSERT
      expect(sentMsg.edit).toHaveBeenCalledWith(
        "**Whoops!**\nI didn't find the MemAddr for achievement ID **123456**.",
      );
    });

    it("handles API errors gracefully", async () => {
      // ARRANGE
      const sentMsg = { edit: vi.fn() } as unknown as Message;
      (mockMessage.reply as Mock<() => Promise<Message>>).mockResolvedValueOnce(sentMsg);

      mockGetAchievementUnlocks.mockRejectedValueOnce(new Error("API Error"));

      // ACT
      await memCommand.execute(mockMessage, ["123456"], {} as any);

      // ASSERT
      expect(sentMsg.edit).toHaveBeenCalledWith("**Whoops!**\nFailed to fetch achievement data.");
    });
  });
});
