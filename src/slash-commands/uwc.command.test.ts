import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import { db } from "../database/db";
import { uwcPollResults, uwcPolls } from "../database/schema";
import { UwcPollService } from "../services/uwc-poll.service";
import { createMockGuildMember, createMockInteraction } from "../test/mocks/discord.mock";
import uwcSlashCommand from "./uwc.command";

// Skip database-dependent tests in CI environment where Drizzle methods are undefined.
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const describeOrSkip = isCI ? describe.skip : describe;

// Mock the tag IDs for testing
const MOCK_UWC_VOTING_TAG_ID = "mockVotingTag123";
const MOCK_UWC_VOTE_CONCLUDED_TAG_ID = "mockConcludedTag123";

// Replace the constants module
mock.module("../config/constants", () => ({
  WORKSHOP_GUILD_ID,
  UWC_VOTING_TAG_ID: MOCK_UWC_VOTING_TAG_ID,
  UWC_VOTE_CONCLUDED_TAG_ID: MOCK_UWC_VOTE_CONCLUDED_TAG_ID,
}));

const UWC_ROLE_ID = "1002687198757388299";

describeOrSkip("SlashCommand: uwc", () => {
  beforeEach(async () => {
    // Clean up database before each test.
    await db.delete(uwcPollResults);
    await db.delete(uwcPolls);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("guild restrictions", () => {
    it("denies command in non-allowed guilds", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: "999999999999999999", // Different guild
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("denies command in DMs", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: null, // DM - no guild ID
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("allows command in the workshop guild", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        poll: {
          question: {
            text: "Is this an Unwelcome Concept?",
          },
          answers: [
            { text: "No, leave as is" },
            { text: "No, but can be improved by change to achievement" },
            { text: "Yes, demote" },
            { text: "Yes, but can be salvaged by change to achievement" },
            { text: "Need further discussion" },
          ],
          allowMultiselect: false,
          duration: 72,
        },
        fetchReply: true,
      });
    });
  });

  describe("permission checks", () => {
    it("denies command when member is not found", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member: null, // No member data
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("denies command when user has no required role or admin permission", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => false), // No required role
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        memberPermissions: {
          has: mock(() => false), // No admin permission
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("allows command when user has the required role", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock((roleId: string) => roleId === UWC_ROLE_ID), // Has required role
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        memberPermissions: {
          has: mock(() => false), // No admin permission needed
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        poll: {
          question: {
            text: "Is this an Unwelcome Concept?",
          },
          answers: [
            { text: "No, leave as is" },
            { text: "No, but can be improved by change to achievement" },
            { text: "Yes, demote" },
            { text: "Yes, but can be salvaged by change to achievement" },
            { text: "Need further discussion" },
          ],
          allowMultiselect: false,
          duration: 72,
        },
        fetchReply: true,
      });
    });

    it("allows command when user has administrator permission", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => false), // No required role
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        memberPermissions: {
          has: mock((permission) => permission === PermissionFlagsBits.Administrator), // Has admin
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        poll: {
          question: {
            text: "Is this an Unwelcome Concept?",
          },
          answers: [
            { text: "No, leave as is" },
            { text: "No, but can be improved by change to achievement" },
            { text: "Yes, demote" },
            { text: "Yes, but can be salvaged by change to achievement" },
            { text: "Need further discussion" },
          ],
          allowMultiselect: false,
          duration: 72,
        },
        fetchReply: true,
      });
    });

    it("handles edge case where member roles are undefined", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: undefined, // Undefined roles
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        memberPermissions: {
          has: mock(() => false), // No admin permission
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    });
  });

  describe("poll creation", () => {
    it("creates a poll with correct structure and timing", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        poll: {
          question: {
            text: "Is this an Unwelcome Concept?",
          },
          answers: [
            { text: "No, leave as is" },
            { text: "No, but can be improved by change to achievement" },
            { text: "Yes, demote" },
            { text: "Yes, but can be salvaged by change to achievement" },
            { text: "Need further discussion" },
          ],
          allowMultiselect: false,
          duration: 72, // 3 days in hours
        },
        fetchReply: true,
      });
    });

    it("creates a poll that does not allow multiple selections", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const callArgs = (interaction.reply as any).mock.calls[0][0];
      expect(callArgs.poll.allowMultiselect).toBe(false);
    });

    it("creates a poll with exactly 5 answer options", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const callArgs = (interaction.reply as any).mock.calls[0][0];
      expect(callArgs.poll.answers).toHaveLength(5);
    });
  });

  describe("database storage", () => {
    it("stores poll data in the database", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channelId: "123456789",
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const storedPoll = await UwcPollService.getUwcPollByMessageId("pollMessage123");
      expect(storedPoll).toBeDefined();
      expect(storedPoll?.messageId).toBe("pollMessage123");
      expect(storedPoll?.channelId).toBe("123456789");
      expect(storedPoll?.creatorId).toBe("987654321");
      expect(storedPoll?.status).toBe("active");
    });

    it("handles database errors gracefully", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
      });

      // Mock the database to throw an error
      const originalCreateUwcPoll = UwcPollService.createUwcPoll;
      UwcPollService.createUwcPoll = mock(() => {
        throw new Error("Database error");
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT - Command should still complete even if database fails
      expect(interaction.reply).toHaveBeenCalled();

      // Restore original method
      UwcPollService.createUwcPoll = originalCreateUwcPoll;
    });
  });

  describe("thread context extraction", () => {
    it("extracts achievement ID and game info from standard format", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "thread123",
          type: ChannelType.PublicThread,
          name: "243323: I Guess Two Heads Aren't That Great After All (Ys: The Vanished Omens)",
          appliedTags: [],
          setAppliedTags: mock(() => Promise.resolve()),
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const storedPoll = await UwcPollService.getUwcPollByMessageId("pollMessage123");
      expect(storedPoll?.achievementId).toBe(243323);
      expect(storedPoll?.achievementName).toBe("I Guess Two Heads Aren't That Great After All");
      expect(storedPoll?.gameName).toBe("Ys: The Vanished Omens");
    });

    it("extracts only achievement ID when format doesn't match", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "thread123",
          type: ChannelType.PublicThread,
          name: "14402: Achievement without game info",
          appliedTags: [],
          setAppliedTags: mock(() => Promise.resolve()),
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const storedPoll = await UwcPollService.getUwcPollByMessageId("pollMessage123");
      expect(storedPoll?.achievementId).toBe(14402);
      expect(storedPoll?.achievementName).toBeNull(); // No game in parentheses, so regex doesn't match
      expect(storedPoll?.gameName).toBeNull();
    });

    it("stores poll without achievement info in non-thread channels", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "channel123",
          type: ChannelType.GuildText,
          name: "general",
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const storedPoll = await UwcPollService.getUwcPollByMessageId("pollMessage123");
      expect(storedPoll?.achievementId).toBeNull();
      expect(storedPoll?.achievementName).toBeNull();
      expect(storedPoll?.threadId).toBeNull();
    });
  });

  describe("forum tag management", () => {
    it("applies voting tag to forum threads", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const mockSetAppliedTags = mock(() => Promise.resolve());
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "thread123",
          type: ChannelType.PublicThread,
          name: "Test Thread",
          appliedTags: ["existingTag123"],
          setAppliedTags: mockSetAppliedTags,
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(mockSetAppliedTags).toHaveBeenCalledWith(["existingTag123", MOCK_UWC_VOTING_TAG_ID]);
    });

    it("doesn't duplicate voting tag if already applied", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const mockSetAppliedTags = mock(() => Promise.resolve());
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "thread123",
          type: ChannelType.PublicThread,
          name: "Test Thread",
          appliedTags: [MOCK_UWC_VOTING_TAG_ID],
          setAppliedTags: mockSetAppliedTags,
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(mockSetAppliedTags).not.toHaveBeenCalled();
    });

    it("handles tag application errors gracefully", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const mockSetAppliedTags = mock(() => {
        throw new Error("Permission denied");
      });

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "thread123",
          type: ChannelType.PublicThread,
          name: "Test Thread",
          appliedTags: [],
          setAppliedTags: mockSetAppliedTags,
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT - Command should still complete even if tag application fails
      expect(interaction.reply).toHaveBeenCalled();
      expect(mockSetAppliedTags).toHaveBeenCalled();
    });

    it("doesn't apply tags in non-thread channels", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true),
          },
        },
      });

      const mockSetAppliedTags = mock(() => Promise.resolve());
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        channel: {
          id: "channel123",
          type: ChannelType.GuildText,
          name: "general",
          setAppliedTags: mockSetAppliedTags,
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(mockSetAppliedTags).not.toHaveBeenCalled();
    });
  });
});
