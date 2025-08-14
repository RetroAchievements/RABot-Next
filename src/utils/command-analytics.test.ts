import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockInteraction, createMockMessage } from "../test/mocks/discord.mock";
import { CommandAnalytics } from "./command-analytics";
import { logger } from "./logger";

describe("Util: CommandAnalytics", () => {
  beforeEach(() => {
    // ... reset analytics data before each test ...
    CommandAnalytics.reset();

    // ... spy on logger ...
    vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  describe("startTracking", () => {
    it("returns the current timestamp", () => {
      // ARRANGE
      const timeBefore = Date.now();

      // ACT
      const startTime = CommandAnalytics.startTracking();

      // ASSERT
      expect(startTime).toBeGreaterThanOrEqual(timeBefore);
      expect(startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("trackLegacyCommand", () => {
    it("tracks a successful legacy command execution", () => {
      // ARRANGE
      const message = createMockMessage({
        author: { id: "user123" } as any,
        guildId: "guild456",
        channelId: "channel789",
      });
      const startTime = Date.now() - 100; // ... 100ms ago ...

      // ACT
      CommandAnalytics.trackLegacyCommand(message, "testcmd", startTime, true);

      // ASSERT
      expect(logger.info).toHaveBeenCalledWith(
        {
          event: "command_executed",
          commandName: "testcmd",
          userId: "user123",
          guildId: "guild456",
          channelId: "channel789",
          executionTime: expect.any(Number),
          success: true,
          errorType: undefined,
          isSlashCommand: false,
        },
        "Command succeeded: !testcmd",
      );
    });

    it("tracks a failed legacy command execution with error", () => {
      // ARRANGE
      const message = createMockMessage();
      const startTime = Date.now() - 50;
      const error = new Error("Test error");

      // ACT
      CommandAnalytics.trackLegacyCommand(message, "failcmd", startTime, false, error);

      // ASSERT
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorType: "Error",
          isSlashCommand: false,
        }),
        "Command failed: !failcmd",
      );
    });

    it("handles commands in DMs (no guild)", () => {
      // ARRANGE
      const message = createMockMessage({
        guildId: null,
      });
      const startTime = Date.now();

      // ACT
      CommandAnalytics.trackLegacyCommand(message, "dmcmd", startTime, true);

      // ASSERT
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: undefined,
        }),
        expect.any(String),
      );
    });
  });

  describe("trackSlashCommand", () => {
    it("tracks a successful slash command execution", () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "testslash",
        user: { id: "user123" } as any,
        guildId: "guild456",
        channelId: "channel789",
      });
      const startTime = Date.now() - 75;

      // ACT
      CommandAnalytics.trackSlashCommand(interaction, startTime, true);

      // ASSERT
      expect(logger.info).toHaveBeenCalledWith(
        {
          event: "command_executed",
          commandName: "testslash",
          userId: "user123",
          guildId: "guild456",
          channelId: "channel789",
          executionTime: expect.any(Number),
          success: true,
          errorType: undefined,
          isSlashCommand: true,
        },
        "Command succeeded: /testslash",
      );
    });

    it("tracks execution time accurately", () => {
      // ARRANGE
      const interaction = createMockInteraction();
      const startTime = Date.now() - 250; // ... 250ms ago ...

      // ACT
      CommandAnalytics.trackSlashCommand(interaction, startTime, true);

      // ASSERT
      const logCalls = (logger.info as any).mock.calls;
      const lastCall = logCalls[logCalls.length - 1][0];
      expect(lastCall.executionTime).toBeGreaterThanOrEqual(250);
      expect(lastCall.executionTime).toBeLessThan(300);
    });
  });

  describe("getStatistics", () => {
    it("returns empty statistics when no commands have been tracked", () => {
      // ACT
      const stats = CommandAnalytics.getStatistics();

      // ASSERT
      expect(stats).toEqual({
        totalCommands: 0,
        commandCounts: {},
        topUsers: [],
        topGuilds: [],
      });
    });

    it("tracks command counts correctly", () => {
      // ARRANGE
      const message1 = createMockMessage({ author: { id: "user1" } as any });
      const message2 = createMockMessage({ author: { id: "user2" } as any });
      const startTime = Date.now();

      // ... execute commands ...
      CommandAnalytics.trackLegacyCommand(message1, "ping", startTime, true);
      CommandAnalytics.trackLegacyCommand(message1, "ping", startTime, true);
      CommandAnalytics.trackLegacyCommand(message2, "ping", startTime, true);
      CommandAnalytics.trackLegacyCommand(message1, "status", startTime, true);

      // ACT
      const stats = CommandAnalytics.getStatistics();

      // ASSERT
      expect(stats.totalCommands).toEqual(4);
      expect(stats.commandCounts).toEqual({
        ping: 3,
        status: 1,
      });
    });

    it("tracks top users correctly", () => {
      // ARRANGE
      const user1Messages = createMockMessage({ author: { id: "user1" } as any });
      const user2Messages = createMockMessage({ author: { id: "user2" } as any });
      const user3Messages = createMockMessage({ author: { id: "user3" } as any });
      const startTime = Date.now();

      // ... user1 executes 5 commands ...
      for (let i = 0; i < 5; i++) {
        CommandAnalytics.trackLegacyCommand(user1Messages, "cmd", startTime, true);
      }
      // ... user2 executes 3 commands ...
      for (let i = 0; i < 3; i++) {
        CommandAnalytics.trackLegacyCommand(user2Messages, "cmd", startTime, true);
      }
      // ... user3 executes 1 command ...
      CommandAnalytics.trackLegacyCommand(user3Messages, "cmd", startTime, true);

      // ACT
      const stats = CommandAnalytics.getStatistics();

      // ASSERT
      expect(stats.topUsers).toEqual([
        { userId: "user1", commandCount: 5 },
        { userId: "user2", commandCount: 3 },
        { userId: "user3", commandCount: 1 },
      ]);
    });

    it("tracks top guilds correctly", () => {
      // ARRANGE
      const guild1Message = createMockMessage({ guildId: "guild1" });
      const guild2Message = createMockMessage({ guildId: "guild2" });
      const dmMessage = createMockMessage({ guildId: null });
      const startTime = Date.now();

      // ... guild1 has 4 commands ...
      for (let i = 0; i < 4; i++) {
        CommandAnalytics.trackLegacyCommand(guild1Message, "cmd", startTime, true);
      }
      // ... guild2 has 2 commands ...
      for (let i = 0; i < 2; i++) {
        CommandAnalytics.trackLegacyCommand(guild2Message, "cmd", startTime, true);
      }
      // ... DM command should not appear in guild stats ...
      CommandAnalytics.trackLegacyCommand(dmMessage, "cmd", startTime, true);

      // ACT
      const stats = CommandAnalytics.getStatistics();

      // ASSERT
      expect(stats.topGuilds).toEqual([
        { guildId: "guild1", commandCount: 4 },
        { guildId: "guild2", commandCount: 2 },
      ]);
    });

    it("limits top users and guilds to 10 entries", () => {
      // ARRANGE
      const startTime = Date.now();

      // ... create 15 users ...
      for (let i = 1; i <= 15; i++) {
        const message = createMockMessage({
          author: { id: `user${i}` } as any,
          guildId: `guild${i}`,
        });
        // ... each user executes i commands ...
        for (let j = 0; j < i; j++) {
          CommandAnalytics.trackLegacyCommand(message, "cmd", startTime, true);
        }
      }

      // ACT
      const stats = CommandAnalytics.getStatistics();

      // ASSERT
      expect(stats.topUsers).toHaveLength(10);
      expect(stats.topGuilds).toHaveLength(10);
      // ... should be sorted by count descending ...
      expect(stats.topUsers[0]?.userId).toEqual("user15");
      expect(stats.topUsers[0]?.commandCount).toEqual(15);
      expect(stats.topUsers[9]?.userId).toEqual("user6");
      expect(stats.topUsers[9]?.commandCount).toEqual(6);
    });
  });

  describe("reset", () => {
    it("clears all analytics data", () => {
      // ARRANGE
      const message = createMockMessage();
      const startTime = Date.now();
      CommandAnalytics.trackLegacyCommand(message, "test", startTime, true);

      // ... verify data was tracked ...
      let stats = CommandAnalytics.getStatistics();
      expect(stats.totalCommands).toEqual(1);

      // ACT
      CommandAnalytics.reset();

      // ASSERT
      stats = CommandAnalytics.getStatistics();
      expect(stats.totalCommands).toEqual(0);
      expect(stats.commandCounts).toEqual({});
      expect(stats.topUsers).toEqual([]);
      expect(stats.topGuilds).toEqual([]);
    });

    it("logs the reset action", () => {
      // ACT
      CommandAnalytics.reset();

      // ASSERT
      expect(logger.info).toHaveBeenCalledWith("Command analytics data has been reset");
    });
  });
});
