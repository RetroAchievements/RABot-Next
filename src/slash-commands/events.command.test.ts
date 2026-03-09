import { describe, expect, it, vi } from "vitest";

import { createMockInteraction } from "../test/mocks/discord.mock";
import eventsSlashCommand from "./events.command";

vi.mock("../config/constants", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return { ...actual, GAMBLER_ROLE_ID: "gambler-role-id" };
});

function createMockMember(name: string, overrides?: Record<string, unknown>) {
  return {
    nickname: name,
    displayName: name,
    id: `id-${name}`,
    roles: { remove: vi.fn(), add: vi.fn() },
    ...overrides,
  };
}

// role.members is a Collection that filters from the guild cache.
// We simulate it with an object whose values() returns an iterator with toArray().
function createMembersProxy(members: ReturnType<typeof createMockMember>[]) {
  return {
    values: () => ({
      toArray: () => members,
    }),
  };
}

function createMockRole(members: ReturnType<typeof createMockMember>[]) {
  return {
    id: "gambler-role-id",
    members: createMembersProxy(members),
  };
}

function createMockGuild(role: ReturnType<typeof createMockRole>) {
  return {
    id: "222222222",
    roles: { fetch: vi.fn().mockResolvedValue(role) },
    members: { fetch: vi.fn().mockResolvedValue(undefined) },
  };
}

describe("SlashCommand: events", () => {
  describe("gambler reset", () => {
    it("fetches guild members before reading role.members to avoid stale cache", async () => {
      // ARRANGE
      const memberA = createMockMember("Alice");
      const memberB = createMockMember("Bob");
      const role = createMockRole([]);

      const guild = createMockGuild(role);

      // Simulate the real behavior: role.members is stale until guild.members.fetch()
      // refreshes the cache, at which point role.members reflects the actual state.
      guild.members.fetch.mockImplementation(async () => {
        (role as any).members = createMembersProxy([memberA, memberB]);
      });

      const interaction = createMockInteraction({
        commandName: "events",
        guild,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "reset"),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(guild.members.fetch).toHaveBeenCalled();
      expect(memberA.roles.remove).toHaveBeenCalledWith(role);
      expect(memberB.roles.remove).toHaveBeenCalledWith(role);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Removed Gambler role from 2 user(s).",
        }),
      );
    });

    it("reports zero removals when no members have the role", async () => {
      // ARRANGE
      const role = createMockRole([]);
      const guild = createMockGuild(role);

      const interaction = createMockInteraction({
        commandName: "events",
        guild,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "reset"),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(guild.members.fetch).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith("Removed Gambler role from 0 user(s).");
    });

    it("uses nickname over displayName when available", async () => {
      // ARRANGE
      const member = createMockMember("DisplayName", { nickname: "Nickname" });
      const role = createMockRole([]);
      const guild = createMockGuild(role);

      guild.members.fetch.mockImplementation(async () => {
        (role as any).members = createMembersProxy([member]);
      });

      const interaction = createMockInteraction({
        commandName: "events",
        guild,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "reset"),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      const editReplyCall = (interaction.editReply as any).mock.calls[0][0];
      const logFile = editReplyCall.files[0];
      const logContent = logFile.attachment.toString("utf8");
      expect(logContent).toEqual("Nickname");
    });
  });

  describe("gambler award", () => {
    it("awards the gambler role to the specified user", async () => {
      // ARRANGE
      const targetUser = { id: "target-user-id" };
      const targetMember = createMockMember("TargetUser");
      const role = createMockRole([]);
      const guild = createMockGuild(role);

      guild.members.fetch.mockResolvedValue(targetMember);

      const interaction = createMockInteraction({
        commandName: "events",
        guild,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "award"),
          getUser: vi.fn(() => targetUser),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(targetMember.roles.add).toHaveBeenCalledWith(role);
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: `Successfully awarded the Gambler role to <@${targetMember.id}>`,
        allowedMentions: { parse: [] },
      });
    });
  });

  describe("error handling", () => {
    it("replies with an error when the gambler role cannot be fetched", async () => {
      // ARRANGE
      const role = createMockRole([]);
      const guild = createMockGuild(role);
      guild.roles.fetch.mockResolvedValue(null);

      const interaction = createMockInteraction({
        commandName: "events",
        guild,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "reset"),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.editReply).toHaveBeenCalledWith(
        "Sorry, I couldn't fetch the Gambler role. Please contact an admin.",
      );
    });

    it("replies with an error when used outside a guild", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "events",
        guild: null,
        options: {
          getSubcommandGroup: vi.fn(() => "gambler"),
          getSubcommand: vi.fn(() => "reset"),
        },
      });

      // ACT
      await eventsSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.editReply).toHaveBeenCalledWith(
        "This command is only supported in a server context.",
      );
    });
  });
});
