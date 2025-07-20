import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { Guild, ThreadChannel } from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import type { BotClient } from "../models";
import * as UwcResultsServiceModule from "../services/uwc-results.service";
import { handleUwcAutoDetect } from "./uwc-auto-detect.handler";

// Mock the logger
mock.module("../utils/logger", () => ({
  logger: {
    info: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
  },
}));

describe("handleUwcAutoDetect", () => {
  beforeEach(() => {
    mock.restore();
  });

  const createMockThread = (overrides?: any) =>
    ({
      id: "thread-123",
      name: "12345: Test Achievement (Test Game)",
      guildId: WORKSHOP_GUILD_ID,
      parentId: "parent-123",
      parent: { name: "unwelcome-concepts" },
      guild: { id: WORKSHOP_GUILD_ID } as Guild,
      send: mock(() => Promise.resolve()),
      ...overrides,
    }) as unknown as ThreadChannel;

  const createMockClient = () =>
    ({
      user: { id: "bot-123" },
    }) as BotClient;

  it("should ignore threads outside the workshop guild", async () => {
    // ARRANGE
    const thread = createMockThread({ guildId: "other-guild" });
    const client = createMockClient();

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(thread.send).not.toHaveBeenCalled();
  });

  it("should ignore threads that don't match the UWC pattern", async () => {
    // ARRANGE
    const thread = createMockThread({ name: "Random thread name" });
    const client = createMockClient();

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(thread.send).not.toHaveBeenCalled();
  });

  it("should ignore threads when UWC_FORUM_CHANNEL_ID is not set", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    delete process.env.UWC_FORUM_CHANNEL_ID;

    const thread = createMockThread();
    const client = createMockClient();

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(thread.send).not.toHaveBeenCalled();

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });

  it("should respect UWC_FORUM_CHANNEL_ID if set", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    process.env.UWC_FORUM_CHANNEL_ID = "specific-forum-123";

    const thread = createMockThread({
      parentId: "different-parent",
      parent: { name: "different-channel" },
    });
    const client = createMockClient();

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(thread.send).not.toHaveBeenCalled();

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });

  it("should search for previous polls when pattern matches", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    process.env.UWC_FORUM_CHANNEL_ID = "parent-123"; // Match the mock thread's parentId

    const thread = createMockThread();
    const client = createMockClient();

    // Use spyOn instead of module mock
    const searchSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "searchPreviousPolls");
    searchSpy.mockResolvedValue([
      {
        message: { id: "msg-123" } as any,
        channel: {} as any,
        status: "approved",
      },
    ]);

    const formatSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "formatAutoResponse");
    formatSpy.mockReturnValue("Test auto-response");

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(searchSpy).toHaveBeenCalledWith(thread.guild, "12345", client.user);
    expect(thread.send).toHaveBeenCalledWith("Test auto-response");

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });

  it("should not send message if no previous polls found", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    process.env.UWC_FORUM_CHANNEL_ID = "parent-123";

    const thread = createMockThread();
    const client = createMockClient();

    // Use spyOn instead of module mock
    const searchSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "searchPreviousPolls");
    searchSpy.mockResolvedValue([]);

    // ACT
    await handleUwcAutoDetect(thread, client);

    // ASSERT
    expect(thread.send).not.toHaveBeenCalled();

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });

  it("should handle errors gracefully", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    process.env.UWC_FORUM_CHANNEL_ID = "parent-123";

    const { logger } = await import("../utils/logger");
    const thread = createMockThread();
    const client = createMockClient();

    // Use spyOn instead of module mock
    const searchSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "searchPreviousPolls");
    searchSpy.mockRejectedValue(new Error("Test error"));

    // ACT
    // Should not throw
    await expect(handleUwcAutoDetect(thread, client)).resolves.toBeUndefined();

    // ASSERT
    expect(logger.error).toHaveBeenCalled();

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });

  it("should parse achievement ID correctly from various formats", async () => {
    // ARRANGE
    const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
    process.env.UWC_FORUM_CHANNEL_ID = "parent-123";

    const testCases = [
      { name: "123: Simple Title (Game)", expectedId: "123" },
      { name: "45678: Title with : colons (Game: Subtitle)", expectedId: "45678" },
      { name: "9: Short (G)", expectedId: "9" },
    ];

    for (const testCase of testCases) {
      const thread = createMockThread({ name: testCase.name });
      const client = createMockClient();

      const searchSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "searchPreviousPolls");
      searchSpy.mockResolvedValue([
        {
          message: { id: "msg-123" } as any,
          channel: {} as any,
          status: "approved",
        },
      ]);

      const formatSpy = spyOn(UwcResultsServiceModule.UwcResultsService, "formatAutoResponse");
      formatSpy.mockReturnValue("Test auto-response");

      // ACT
      await handleUwcAutoDetect(thread, client);

      // ASSERT
      expect(searchSpy).toHaveBeenCalledWith(thread.guild, testCase.expectedId, client.user);
    }

    // Restore original env
    process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
  });
});
