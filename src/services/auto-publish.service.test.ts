import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ChannelType, MessageFlags } from "discord.js";

import { AutoPublishService } from "./auto-publish.service";

// Mock the constants module.
mock.module("../config/constants", () => ({
  AUTO_PUBLISH_CHANNEL_IDS: ["123456789012345678", "987654321098765432"],
}));

// Mock the logger module.
mock.module("../utils/logger", () => ({
  logger: {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  },
  logError: mock(),
  logApiCall: mock(),
}));

describe("Service: AutoPublishService", () => {
  // Mock message object.
  const createMockMessage = (overrides = {}) => ({
    channel: { type: ChannelType.GuildAnnouncement },
    channelId: "123456789012345678",
    author: { bot: false, tag: "TestUser#1234" },
    flags: {
      has: mock((_flag: MessageFlags) => false),
    },
    crosspost: mock(),
    id: "message123",
    guildId: "guild123",
    ...overrides,
  });

  beforeEach(() => {
    // Clear all mocks before each test.
    mock.restore();
  });

  describe("shouldAutoPublish", () => {
    it("is defined", () => {
      // ASSERT
      expect(AutoPublishService.shouldAutoPublish).toBeDefined();
    });

    it("returns false for non-announcement channels", () => {
      // ARRANGE
      const message = createMockMessage({
        channel: { type: ChannelType.GuildText },
      });

      // ACT
      const result = AutoPublishService.shouldAutoPublish(message as any);

      // ASSERT
      expect(result).toBe(false);
    });

    it("returns false for bot messages", () => {
      // ARRANGE
      const message = createMockMessage({
        author: { bot: true, tag: "Bot#0000" },
      });

      // ACT
      const result = AutoPublishService.shouldAutoPublish(message as any);

      // ASSERT
      expect(result).toBe(false);
    });

    it("returns false for already crossposted messages", () => {
      // ARRANGE
      const message = createMockMessage({
        flags: {
          has: mock((flag: MessageFlags) => flag === MessageFlags.Crossposted),
        },
      });

      // ACT
      const result = AutoPublishService.shouldAutoPublish(message as any);

      // ASSERT
      expect(result).toBe(false);
    });

    it("returns false for channels not in auto-publish list", () => {
      // ARRANGE
      const message = createMockMessage({
        channelId: "999999999999999999", // Not in AUTO_PUBLISH_CHANNEL_IDS
      });

      // ACT
      const result = AutoPublishService.shouldAutoPublish(message as any);

      // ASSERT
      expect(result).toBe(false);
    });

    it("returns true for valid messages in configured channels", () => {
      // ARRANGE
      const message = createMockMessage();

      // ACT
      const result = AutoPublishService.shouldAutoPublish(message as any);

      // ASSERT
      expect(result).toBe(true);
    });
  });

  describe("publishMessage", () => {
    it("is defined", () => {
      // ASSERT
      expect(AutoPublishService.publishMessage).toBeDefined();
    });

    it("successfully publishes a message", async () => {
      // ARRANGE
      const message = createMockMessage();
      message.crosspost.mockResolvedValue(undefined);

      // ACT
      const result = await AutoPublishService.publishMessage(message as any);

      // ASSERT
      expect(result).toBe(true);
      expect(message.crosspost).toHaveBeenCalledTimes(1);
    });

    it("handles rate limit errors gracefully", async () => {
      // ARRANGE
      const message = createMockMessage();
      const error = new Error("You are being rate limited");
      message.crosspost.mockRejectedValue(error);

      // ACT
      const result = await AutoPublishService.publishMessage(message as any);

      // ASSERT
      expect(result).toBe(false);
      expect(message.crosspost).toHaveBeenCalledTimes(1);
    });

    it("handles permission errors gracefully", async () => {
      // ARRANGE
      const message = createMockMessage();
      const error = new Error("Missing Permissions");
      message.crosspost.mockRejectedValue(error);

      // ACT
      const result = await AutoPublishService.publishMessage(message as any);

      // ASSERT
      expect(result).toBe(false);
      expect(message.crosspost).toHaveBeenCalledTimes(1);
    });

    it("handles unknown errors gracefully", async () => {
      // ARRANGE
      const message = createMockMessage();
      const error = new Error("Unknown error");
      message.crosspost.mockRejectedValue(error);

      // ACT
      const result = await AutoPublishService.publishMessage(message as any);

      // ASSERT
      expect(result).toBe(false);
      expect(message.crosspost).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleMessage", () => {
    it("is defined", () => {
      // ASSERT
      expect(AutoPublishService.handleMessage).toBeDefined();
    });

    it("does nothing if message should not be auto-published", async () => {
      // ARRANGE
      const message = createMockMessage({
        channel: { type: ChannelType.GuildText },
      });
      const shouldAutoPublishSpy = spyOn(AutoPublishService, "shouldAutoPublish").mockReturnValue(
        false,
      );
      const publishMessageSpy = spyOn(AutoPublishService, "publishMessage");

      // ACT
      await AutoPublishService.handleMessage(message as any);

      // ASSERT
      expect(shouldAutoPublishSpy).toHaveBeenCalledWith(message);
      expect(publishMessageSpy).not.toHaveBeenCalled();
    });

    it("attempts to publish if message should be auto-published", async () => {
      // ARRANGE
      const message = createMockMessage();
      const shouldAutoPublishSpy = spyOn(AutoPublishService, "shouldAutoPublish").mockReturnValue(
        true,
      );
      const publishMessageSpy = spyOn(AutoPublishService, "publishMessage").mockResolvedValue(true);

      // ACT
      await AutoPublishService.handleMessage(message as any);

      // ASSERT
      expect(shouldAutoPublishSpy).toHaveBeenCalledWith(message);
      expect(publishMessageSpy).toHaveBeenCalledWith(message);
    });
  });
});
