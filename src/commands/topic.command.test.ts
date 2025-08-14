import { ChannelType } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockMessage,
  createMockTextChannel,
  createMockUser,
} from "../test/mocks/discord.mock";
import topicCommand from "./topic.command";

describe("Command: topic", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("shows topic for text channel with topic", async () => {
      // ARRANGE
      const testTopic = "This is a test channel topic";
      const testChannel = createMockTextChannel({
        name: "test-channel",
        topic: testTopic,
      } as any);
      mockMessage = createMockMessage({ channel: testChannel });

      // ACT
      await topicCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        `#test-channel's topic:\n\`---\`\n**${testTopic}**\n\`---\``,
      );
    });

    it("shows empty topic for text channel without topic", async () => {
      // ARRANGE
      const testChannel = createMockTextChannel({
        name: "test-channel",
        topic: null,
      } as any);
      mockMessage = createMockMessage({ channel: testChannel });

      // ACT
      await topicCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        `#test-channel's topic:\n\`---\`\n** **\n\`---\``,
      );
    });

    it("shows username for DM channel", async () => {
      // ARRANGE
      const testUser = createMockUser({ username: "testuser" });
      const dmChannel = {
        isDMBased: vi.fn(() => true),
        name: "dm-channel",
        topic: undefined,
      };
      mockMessage = createMockMessage({ channel: dmChannel, author: testUser });

      // ACT
      await topicCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(`@testuser's topic:\n\`---\`\n** **\n\`---\``);
    });

    it("handles channel without topic property", async () => {
      // ARRANGE
      const channelWithoutTopic = {
        isDMBased: vi.fn(() => false),
        name: "voice-channel",
        type: ChannelType.GuildVoice,
        // No topic property (like voice channels)
      };
      mockMessage = createMockMessage({ channel: channelWithoutTopic });

      // ACT
      await topicCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        `#voice-channel's topic:\n\`---\`\n** **\n\`---\``,
      );
    });

    it("handles channel with empty string topic", async () => {
      // ARRANGE
      const testChannel = createMockTextChannel({
        name: "empty-topic-channel",
        topic: "",
      } as any);
      mockMessage = createMockMessage({ channel: testChannel });

      // ACT
      await topicCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        `#empty-topic-channel's topic:\n\`---\`\n** **\n\`---\``,
      );
    });
  });
});
