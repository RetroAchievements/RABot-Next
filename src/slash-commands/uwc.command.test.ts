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
});
