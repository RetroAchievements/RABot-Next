import { ChannelType, MessageFlags } from "discord.js";
import { describe, expect, it } from "vitest";

import { createMockInteraction, createMockTextChannel } from "../test/mocks/discord.mock";
import topicSlashCommand from "./topic.command";

describe("SlashCommand: topic", () => {
  it("has correct command data", () => {
    // ASSERT
    expect(topicSlashCommand.data.name).toBe("topic");
    expect(topicSlashCommand.data.description).toBe("Display the current channel topic");
    expect(topicSlashCommand.legacyName).toBe("topic");
  });

  describe("execute", () => {
    it("replies with error when used in DM channel", async () => {
      // ARRANGE
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: {
          type: ChannelType.DM,
        } as any,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in text channels.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("replies with error when channel is null", async () => {
      // ARRANGE
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: null,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in text channels.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("replies with message when channel has no topic", async () => {
      // ARRANGE
      const mockChannel = createMockTextChannel({
        topic: null,
      } as any);
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: mockChannel,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This channel has no topic set.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("displays the topic when channel has a topic", async () => {
      // ARRANGE
      const testTopic = "Welcome to the general discussion channel!";
      const mockChannel = createMockTextChannel({
        topic: testTopic,
      } as any);
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: mockChannel,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: `**Channel Topic:**\n${testTopic}`,
      });
    });

    it("displays the topic with special characters correctly", async () => {
      // ARRANGE
      const testTopic = "Rules: 1) Be nice 2) No spam 🎮 | Links: https://example.com";
      const mockChannel = createMockTextChannel({
        topic: testTopic,
      } as any);
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: mockChannel,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: `**Channel Topic:**\n${testTopic}`,
      });
    });

    it("handles thread channels correctly", async () => {
      // ARRANGE
      const testTopic = "Thread parent topic";
      const mockChannel = {
        type: ChannelType.PublicThread,
        topic: testTopic,
      } as any;
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: mockChannel,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: `**Channel Topic:**\n${testTopic}`,
      });
    });

    it("handles voice channel text chat correctly", async () => {
      // ARRANGE
      const mockChannel = {
        type: ChannelType.GuildVoice,
        // Voice channels don't have a topic property.
      } as any;
      const mockInteraction = createMockInteraction({
        commandName: "topic",
        channel: mockChannel,
      });

      // ACT
      await topicSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in text channels.",
        flags: MessageFlags.Ephemeral,
      });
    });
  });
});
