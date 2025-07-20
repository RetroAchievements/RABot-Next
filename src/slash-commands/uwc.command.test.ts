import { afterEach, describe, expect, it, mock } from "bun:test";
import { MessageFlags, PermissionFlagsBits } from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import { createMockGuildMember, createMockInteraction } from "../test/mocks/discord.mock";
import uwcSlashCommand from "./uwc.command";

const UWC_ROLE_ID = "1002687198757388299";

describe("SlashCommand: uwc", () => {
  afterEach(() => {
    mock.restore();
  });

  describe("guild restrictions", () => {
    it("denies command in non-allowed guilds", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: "999999999999999999", // Different guild
        options: {
          getSubcommand: mock(() => "create"),
        },
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
        options: {
          getSubcommand: mock(() => "create"),
        },
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
        options: {
          getSubcommand: mock(() => "create"),
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
        options: {
          getSubcommand: mock(() => "create"),
        },
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
        options: {
          getSubcommand: mock(() => "create"),
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
        options: {
          getSubcommand: mock(() => "create"),
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
        options: {
          getSubcommand: mock(() => "create"),
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
        options: {
          getSubcommand: mock(() => "create"),
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
        options: {
          getSubcommand: mock(() => "create"),
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
          duration: 72, // 3 days in hours
        },
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
        options: {
          getSubcommand: mock(() => "create"),
        },
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
        options: {
          getSubcommand: mock(() => "create"),
        },
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      const callArgs = (interaction.reply as any).mock.calls[0][0];
      expect(callArgs.poll.answers).toHaveLength(5);
    });
  });

  describe("list subcommand", () => {
    it("shows message when no guild is available", async () => {
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
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: null,
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "This command can only be used in a server.",
      });
    });

    it("shows message when no active polls are found", async () => {
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
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(new Map())),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "No UWC polls found in this server.",
      });
    });

    it("displays active UWC polls with time remaining", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      const mockVoters = new Map();
      mockVoters.set("user-123", { id: "user-123" }); // Different user voted

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(mockVoters)),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const mockPoll = {
        question: { text: "Is this an Unwelcome Concept?" },
        expiresAt: futureDate,
        answers: mockAnswers,
      };

      const mockMessage = {
        author: { id: "bot-id" },
        poll: mockPoll,
        url: "https://discord.com/channels/123/456/789",
      };

      const mockMessages = new Map();
      mockMessages.set("123", mockMessage);

      const mockChannel = {
        name: "test-channel",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockChannels = new Map();
      mockChannels.set("channel-id", mockChannel);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(mockChannels)),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      expect(editReplyCall.content).toContain("UWC Polls:");
      expect(editReplyCall.content).toContain("Need Your Vote (1):");
      expect(editReplyCall.content).toContain(
        "[Poll in #test-channel](https://discord.com/channels/123/456/789)",
      );
      expect(editReplyCall.content).toMatch(/\d+ hours remaining/);
    });

    it("filters out non-UWC polls and expired polls", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Create test messages
      const mockVoters = new Map();
      mockVoters.set("user-123", { id: "user-123" }); // Different user voted

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(mockVoters)),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const activeUwcPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      const expiredUwcPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: pastDate,
        },
        url: "https://discord.com/channels/123/456/790",
      };

      const nonUwcPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Different poll question" },
          expiresAt: futureDate,
        },
        url: "https://discord.com/channels/123/456/791",
      };

      const nonBotMessage = {
        author: { id: "other-user" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
        },
        url: "https://discord.com/channels/123/456/792",
      };

      // Create a Map with all test messages
      const mockMessages = new Map();
      mockMessages.set("1", activeUwcPoll);
      mockMessages.set("2", expiredUwcPoll);
      mockMessages.set("3", nonUwcPoll);
      mockMessages.set("4", nonBotMessage);

      const mockChannel = {
        name: "test-channel",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockChannels = new Map();
      mockChannels.set("channel-id", mockChannel);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(mockChannels)),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      expect(editReplyCall.content).toContain("UWC Polls:");
    });

    it("separates polls where user has voted from those they haven't", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const userId = "test-user-id";

      // Poll where user has voted
      const votedVoters = new Map();
      votedVoters.set(userId, { id: userId }); // User has voted
      votedVoters.set("other-user", { id: "other-user" });

      const votedAnswer = {
        fetchVoters: mock(() => Promise.resolve(votedVoters)),
      };

      const votedAnswers = new Map();
      votedAnswers.set(1, votedAnswer);

      const votedPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: votedAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      // Poll where user has not voted
      const unvotedVoters = new Map();
      unvotedVoters.set("other-user", { id: "other-user" }); // Only other users voted

      const unvotedAnswer = {
        fetchVoters: mock(() => Promise.resolve(unvotedVoters)),
      };

      const unvotedAnswers = new Map();
      unvotedAnswers.set(1, unvotedAnswer);

      const unvotedPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: unvotedAnswers,
        },
        url: "https://discord.com/channels/123/456/790",
      };

      const mockMessages = new Map();
      mockMessages.set("1", votedPoll);
      mockMessages.set("2", unvotedPoll);

      const mockChannel = {
        name: "test-channel",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockChannels = new Map();
      mockChannels.set("channel-id", mockChannel);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(mockChannels)),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: userId },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      expect(editReplyCall.content).toContain("UWC Polls:");
      expect(editReplyCall.content).toContain("Need Your Vote (1):");
      expect(editReplyCall.content).toContain("Already Voted (1):");
      expect(editReplyCall.content).toContain(
        "[Poll in #test-channel](https://discord.com/channels/123/456/790)",
      ); // Unvoted
      expect(editReplyCall.content).toContain(
        "[Poll in #test-channel](https://discord.com/channels/123/456/789)",
      ); // Voted
    });

    it("shows ended polls without action tags in awaiting action section", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(new Map())),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const endedPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: pastDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      const mockMessages = new Map();
      mockMessages.set("1", endedPoll);

      const mockThread = {
        name: "test-thread",
        isThread: mock(() => true),
        appliedTags: [], // No tags applied
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockThreads = new Map();
      mockThreads.set("thread-id", mockThread);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(new Map())), // No regular channels
            fetchActiveThreads: mock(() => Promise.resolve({ threads: mockThreads })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      expect(editReplyCall.content).toContain("UWC Polls:");
      expect(editReplyCall.content).toContain("Awaiting Action (1):");
      expect(editReplyCall.content).toContain(
        "[Poll in #test-thread](https://discord.com/channels/123/456/789)",
      );
      expect(editReplyCall.content).toContain("ended 2 days ago");
    });

    it("excludes ended polls with approved or denied tags", async () => {
      // ARRANGE
      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(new Map())),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const endedPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: pastDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      const mockMessages = new Map();
      mockMessages.set("1", endedPoll);

      const mockThread = {
        name: "test-thread",
        isThread: mock(() => true),
        appliedTags: ["1261677823408607295"], // Has Approved tag
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockThreads = new Map();
      mockThreads.set("thread-id", mockThread);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(new Map())),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: mockThreads })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      expect(editReplyCall.content).toBe("No UWC polls found in this server.");
    });
  });

  describe("search subcommand", () => {
    it("shows message when no guild is available", async () => {
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
        options: {
          getSubcommand: mock(() => "search"),
          getString: mock(() => "12345"),
        },
        guild: null,
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "This command can only be used in a server.",
      });
    });

    it("shows message when no matching polls are found", async () => {
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
        options: {
          getSubcommand: mock(() => "search"),
          getString: mock(() => "nonexistent"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(new Map())),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      // ACT
      await uwcSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'No UWC polls found containing "nonexistent" in the channel/thread name.',
      });
    });
  });

  describe("channel filtering", () => {
    it("only searches for polls in the UWC forum channel when configured", async () => {
      // ARRANGE
      const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
      process.env.UWC_FORUM_CHANNEL_ID = "uwc-forum-123";

      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const mockVoters = new Map();

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(mockVoters)),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const uwcPollInCorrectChannel = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      const uwcPollInWrongChannel = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/790",
      };

      const mockMessages1 = new Map();
      mockMessages1.set("1", uwcPollInCorrectChannel);

      const mockMessages2 = new Map();
      mockMessages2.set("2", uwcPollInWrongChannel);

      const mockUwcChannel = {
        id: "uwc-forum-123",
        name: "uwc-forum",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages1)),
        },
      };

      const mockOtherChannel = {
        id: "other-channel-456",
        name: "rabot",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages2)),
        },
      };

      const mockChannels = new Map();
      mockChannels.set("uwc-forum-123", mockUwcChannel);
      mockChannels.set("other-channel-456", mockOtherChannel);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(mockChannels)),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      try {
        // ACT
        await uwcSlashCommand.execute(interaction, null as any);

        // ASSERT
        // The channel fetch should have been called for the correct channel
        expect(mockUwcChannel.messages.fetch).toHaveBeenCalled();
        // The other channel should NOT have its messages fetched
        expect(mockOtherChannel.messages.fetch).not.toHaveBeenCalled();

        const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
        expect(editReplyCall.content).toContain("UWC Polls:");
        // Should only find the poll in the correct channel
        expect(editReplyCall.content).toContain("[Poll in #uwc-forum]");
        expect(editReplyCall.content).not.toContain("[Poll in #rabot]");
      } finally {
        // Restore original env
        process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
      }
    });

    it("searches all channels when UWC_FORUM_CHANNEL_ID is not configured", async () => {
      // ARRANGE
      const originalEnv = process.env.UWC_FORUM_CHANNEL_ID;
      delete process.env.UWC_FORUM_CHANNEL_ID;

      const member = createMockGuildMember({
        roles: {
          cache: {
            has: mock(() => true), // Has required role
          },
        },
      });

      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const mockVoters = new Map();

      const mockAnswer = {
        fetchVoters: mock(() => Promise.resolve(mockVoters)),
      };

      const mockAnswers = new Map();
      mockAnswers.set(1, mockAnswer);

      const uwcPoll = {
        author: { id: "bot-id" },
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: futureDate,
          answers: mockAnswers,
        },
        url: "https://discord.com/channels/123/456/789",
      };

      const mockMessages = new Map();
      mockMessages.set("1", uwcPoll);

      const mockChannel1 = {
        id: "channel-123",
        name: "channel1",
        messages: {
          fetch: mock(() => Promise.resolve(mockMessages)),
        },
      };

      const mockChannel2 = {
        id: "channel-456",
        name: "channel2",
        messages: {
          fetch: mock(() => Promise.resolve(new Map())),
        },
      };

      const mockChannels = new Map();
      mockChannels.set("channel-123", mockChannel1);
      mockChannels.set("channel-456", mockChannel2);

      const interaction = createMockInteraction({
        commandName: "uwc",
        guildId: WORKSHOP_GUILD_ID,
        member,
        options: {
          getSubcommand: mock(() => "list"),
        },
        guild: {
          channels: {
            fetch: mock(() => Promise.resolve(mockChannels)),
            fetchActiveThreads: mock(() => Promise.resolve({ threads: new Map() })),
          },
        },
        client: { user: { id: "bot-id" } },
        user: { id: "test-user-id" },
        deferReply: mock(() => Promise.resolve()),
        editReply: mock(() => Promise.resolve()),
      });

      try {
        // ACT
        await uwcSlashCommand.execute(interaction, null as any);

        // ASSERT
        // Both channels should have their messages fetched
        expect(mockChannel1.messages.fetch).toHaveBeenCalled();
        expect(mockChannel2.messages.fetch).toHaveBeenCalled();
      } finally {
        // Restore original env
        process.env.UWC_FORUM_CHANNEL_ID = originalEnv;
      }
    });
  });
});
