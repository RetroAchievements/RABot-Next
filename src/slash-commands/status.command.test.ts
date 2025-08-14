import { Collection } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GithubReleaseService } from "../services/github-release.service";
import { createMockClient, createMockInteraction } from "../test/mocks/discord.mock";
import statusCommand from "./status.command";

describe("SlashCommand: status", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient({
      guilds: {
        cache: new Collection([
          ["guild1", { memberCount: 100 } as any],
          ["guild2", { memberCount: 250 } as any],
        ]),
      } as any,
      commands: new Collection([
        ["cmd1", {} as any],
        ["cmd2", {} as any],
        ["cmd3", {} as any],
      ]),
      ws: { ping: 42 } as any,
      commandPrefix: "!",
    });

    mockInteraction = createMockInteraction({
      commandName: "status",
      client: mockClient,
    });

    // Note: We cannot mock Bun.version in Bun runtime, so we'll test with the actual version

    // Mock process methods
    vi.spyOn(process, "uptime").mockReturnValue(3661); // 1 hour, 1 minute, 1 second
    vi.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 50 * 1024 * 1024, // 50MB
      heapTotal: 40 * 1024 * 1024, // 40MB
      heapUsed: 25 * 1024 * 1024, // 25MB
      external: 5 * 1024 * 1024, // 5MB
      arrayBuffers: 1 * 1024 * 1024, // 1MB
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("displays bot status with all required fields", async () => {
      // ARRANGE
      const mockVersion = "2.1.0";
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue(mockVersion);

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const replyOptions = replyCall[0];

      expect(replyOptions.embeds).toHaveLength(1);
      const embed = replyOptions.embeds[0].toJSON();

      expect(embed.title).toBe("📊 RABot Status");
      expect(embed.color).toBe(0x0099ff);
      expect(embed.fields).toHaveLength(10);
      expect(embed.footer?.text).toBe("RetroAchievements Discord Bot");
      expect(embed.timestamp).toBeDefined();
    });

    it("displays version from GitHub service", async () => {
      // ARRANGE
      const mockVersion = "2.1.0";
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue(mockVersion);

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      expect(GithubReleaseService.fetchLatestVersion).toHaveBeenCalledOnce();
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const versionField = embed.fields?.find((field: any) => field.name === "📦 Version");
      expect(versionField?.value).toBe(mockVersion);
    });

    it("displays 'Unknown' when GitHub service returns null", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue(null);

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const versionField = embed.fields?.find((field: any) => field.name === "📦 Version");
      expect(versionField?.value).toBe("Unknown");
    });

    it("formats uptime correctly for hours, minutes, and seconds", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");
      vi.spyOn(process, "uptime").mockReturnValue(3661); // 1h 1m 1s

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const uptimeField = embed.fields?.find((field: any) => field.name === "⏱️ Uptime");
      expect(uptimeField?.value).toBe("1h 1m 1s");
    });

    it("formats uptime correctly for days", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");
      vi.spyOn(process, "uptime").mockReturnValue(90061); // 1d 1h 1m 1s

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const uptimeField = embed.fields?.find((field: any) => field.name === "⏱️ Uptime");
      expect(uptimeField?.value).toBe("1d 1h 1m 1s");
    });

    it("formats uptime correctly for seconds only", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");
      vi.spyOn(process, "uptime").mockReturnValue(42); // 42s

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const uptimeField = embed.fields?.find((field: any) => field.name === "⏱️ Uptime");
      expect(uptimeField?.value).toBe("42s");
    });

    it("displays memory usage in MB", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const memoryField = embed.fields?.find((field: any) => field.name === "💾 Memory Usage");
      expect(memoryField?.value).toBe("25MB"); // 25MB heapUsed from mock
    });

    it("displays client statistics correctly", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      // Check latency
      const latencyField = embed.fields?.find((field: any) => field.name === "📡 Latency");
      expect(latencyField?.value).toBe("42ms");

      // Check servers count
      const serversField = embed.fields?.find((field: any) => field.name === "🏠 Servers");
      expect(serversField?.value).toBe("2");

      // Check total users (100 + 250 = 350)
      const usersField = embed.fields?.find((field: any) => field.name === "👥 Total Users");
      expect(usersField?.value).toBe("350");

      // Check commands count
      const commandsField = embed.fields?.find((field: any) => field.name === "📝 Commands");
      expect(commandsField?.value).toBe("3");

      // Check command prefix
      const prefixField = embed.fields?.find((field: any) => field.name === "🎮 Prefix");
      expect(prefixField?.value).toBe("`!`");
    });

    it("displays runtime information", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      // Check runtime (uses mocked Bun.version)
      const runtimeField = embed.fields?.find((field: any) => field.name === "⚙️ Runtime");
      expect(runtimeField?.value).toBe("Bun 1.0.0");

      // Check library
      const libraryField = embed.fields?.find((field: any) => field.name === "📚 Library");
      expect(libraryField?.value).toBe("Discord.js v14");
    });

    it("contains all required embed fields", async () => {
      // ARRANGE
      vi.spyOn(GithubReleaseService, "fetchLatestVersion").mockResolvedValue("2.1.0");

      // ACT
      await statusCommand.execute(mockInteraction, mockClient);

      // ASSERT
      const replyCall = (mockInteraction.reply as any).mock.calls[0];
      const embed = replyCall[0].embeds[0].toJSON();

      const expectedFields = [
        "📦 Version",
        "⏱️ Uptime",
        "💾 Memory Usage",
        "📡 Latency",
        "🏠 Servers",
        "👥 Total Users",
        "📝 Commands",
        "⚙️ Runtime",
        "📚 Library",
        "🎮 Prefix",
      ];

      expect(embed.fields).toHaveLength(10);
      for (const fieldName of expectedFields) {
        const field = embed.fields?.find((f: any) => f.name === fieldName);
        expect(field).toBeDefined();
        expect(field?.value).toBeDefined();
      }
    });
  });
});
