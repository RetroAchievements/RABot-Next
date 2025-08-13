import { ChannelType, MessageFlags } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHEAT_INVESTIGATION_CATEGORY_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import { teamService } from "../services";
import {
  createMockInteraction,
  createMockTextChannel,
  createMockThreadChannel,
} from "../test/mocks/discord.mock";
import pingteamSlashCommand from "./pingteam.command";

// Mock the teamService from the service registry
vi.mock("../services", () => ({
  teamService: {
    getTeamMembersByName: vi.fn(),
    addMemberByTeamName: vi.fn(),
    removeMemberByTeamName: vi.fn(),
    createTeam: vi.fn(),
  },
}));

describe("SlashCommand: pingteam", () => {
  beforeEach(() => {
    // Reset mock implementations.
    vi.mocked(teamService.getTeamMembersByName).mockResolvedValue([]);
    vi.mocked(teamService.addMemberByTeamName).mockResolvedValue();
    vi.mocked(teamService.removeMemberByTeamName).mockResolvedValue(true);
    vi.mocked(teamService.createTeam).mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Clear all mocks to prevent test pollution.
    vi.clearAllMocks();
  });

  describe("ping subcommand", () => {
    describe("RACheats team restrictions", () => {
      // Note: These tests now require the command to be in the allowed guild
      it("denies ping in DM channels", async () => {
        // ARRANGE
        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel: null, // DM channel
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team can't be pinged here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("denies ping in DM channel type", async () => {
        // ARRANGE
        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel: { type: ChannelType.DM },
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team can't be pinged here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("denies ping outside cheat investigation category", async () => {
        // ARRANGE
        const wrongCategoryId = "9999999999999999999";
        const channel = createMockTextChannel({
          parentId: wrongCategoryId,
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team can't be pinged here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("allows ping in cheat investigation category", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: CHEAT_INVESTIGATION_CATEGORY_ID,
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "racheats"),
          },
        });

        (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
        expect(interaction.reply).toHaveBeenCalledWith(
          "🔔 **racheats team ping:**\n<@user1> <@user2>",
        );
      });

      it("is case insensitive for team name", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: "9999999999999999999", // Wrong category
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "RaChEaTs"), // Mixed case
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team can't be pinged here.",
          flags: MessageFlags.Ephemeral,
        });
      });

      describe("forum thread channels", () => {
        it("denies ping in PublicThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PublicThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team can't be pinged here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("denies ping in PrivateThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PrivateThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team can't be pinged here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("denies ping in AnnouncementThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.AnnouncementThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team can't be pinged here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("allows ping in PublicThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PublicThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith(
            "🔔 **racheats team ping:**\n<@user1> <@user2>",
          );
        });

        it("allows ping in PrivateThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PrivateThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith(
            "🔔 **racheats team ping:**\n<@user1> <@user2>",
          );
        });

        it("allows ping in AnnouncementThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.AnnouncementThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "ping"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith(
            "🔔 **racheats team ping:**\n<@user1> <@user2>",
          );
        });
      });
    });

    describe("non-RACheats teams", () => {
      it("allows ping for other teams in any channel", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: "9999999999999999999", // Random category
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "ping"),
            getString: vi.fn(() => "moderators"),
          },
        });

        (teamService.getTeamMembersByName as any).mockResolvedValue(["mod1", "mod2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("moderators");
        expect(interaction.reply).toHaveBeenCalledWith(
          "🔔 **moderators team ping:**\n<@mod1> <@mod2>",
        );
      });
    });
  });

  describe("list subcommand", () => {
    describe("RACheats team restrictions", () => {
      // Note: These tests now require the command to be in the allowed guild
      it("denies list in DM channels", async () => {
        // ARRANGE
        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel: null, // DM channel
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team member list can't be viewed here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("denies list in DM channel type", async () => {
        // ARRANGE
        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel: { type: ChannelType.DM },
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team member list can't be viewed here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("denies list outside cheat investigation category", async () => {
        // ARRANGE
        const wrongCategoryId = "9999999999999999999";
        const channel = createMockTextChannel({
          parentId: wrongCategoryId,
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "racheats"),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team member list can't be viewed here.",
          flags: MessageFlags.Ephemeral,
        });
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
      });

      it("allows list in cheat investigation category", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: CHEAT_INVESTIGATION_CATEGORY_ID,
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "racheats"),
          },
        });

        (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "**Members of racheats:**\n• <@user1>\n• <@user2>",
          allowedMentions: { parse: [] },
        });
      });

      it("is case insensitive for team name", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: "9999999999999999999", // Wrong category
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "RaChEaTs"), // Mixed case
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "The RACheats team member list can't be viewed here.",
          flags: MessageFlags.Ephemeral,
        });
      });

      describe("forum thread channels", () => {
        it("denies list in PublicThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PublicThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team member list can't be viewed here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("denies list in PrivateThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PrivateThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team member list can't be viewed here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("denies list in AnnouncementThread outside cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.AnnouncementThread,
            parentCategoryId: "9999999999999999999", // Wrong category
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "The RACheats team member list can't be viewed here.",
            flags: MessageFlags.Ephemeral,
          });
          expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        });

        it("allows list in PublicThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PublicThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "**Members of racheats:**\n• <@user1>\n• <@user2>",
            allowedMentions: { parse: [] },
          });
        });

        it("allows list in PrivateThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.PrivateThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "**Members of racheats:**\n• <@user1>\n• <@user2>",
            allowedMentions: { parse: [] },
          });
        });

        it("allows list in AnnouncementThread within cheat investigation category", async () => {
          // ARRANGE
          const threadChannel = createMockThreadChannel({
            type: ChannelType.AnnouncementThread,
            parentCategoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
          });

          const interaction = createMockInteraction({
            commandName: "pingteam",
            guildId: WORKSHOP_GUILD_ID,
            channel: threadChannel,
            options: {
              getSubcommand: vi.fn(() => "list"),
              getString: vi.fn(() => "racheats"),
            },
          });

          (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
          expect(interaction.reply).toHaveBeenCalledWith({
            content: "**Members of racheats:**\n• <@user1>\n• <@user2>",
            allowedMentions: { parse: [] },
          });
        });
      });
    });

    describe("non-RACheats teams", () => {
      it("allows list for other teams in any channel", async () => {
        // ARRANGE
        const channel = createMockTextChannel({
          parentId: "9999999999999999999", // Random category
        } as any);

        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: WORKSHOP_GUILD_ID,
          channel,
          options: {
            getSubcommand: vi.fn(() => "list"),
            getString: vi.fn(() => "moderators"),
          },
        });

        (teamService.getTeamMembersByName as any).mockResolvedValue(["mod1", "mod2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("moderators");
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "**Members of moderators:**\n• <@mod1>\n• <@mod2>",
          allowedMentions: { parse: [] },
        });
      });
    });
  });

  describe("other subcommands", () => {
    it("does not apply restrictions to add subcommand", async () => {
      // ARRANGE
      const channel = createMockTextChannel({
        parentId: "9999999999999999999", // Wrong category
      } as any);

      const mockUser = { id: "user123" };
      const interaction = createMockInteraction({
        commandName: "pingteam",
        guildId: WORKSHOP_GUILD_ID,
        channel,
        options: {
          getSubcommand: vi.fn(() => "add"),
          getString: vi.fn(() => "racheats"),
          getUser: vi.fn(() => mockUser),
        },
      });

      // ACT
      await pingteamSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(teamService.addMemberByTeamName).toHaveBeenCalledWith(
        "racheats",
        "user123",
        expect.any(String),
      );
      expect(interaction.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Added"));
    });

    it("does not apply restrictions to remove subcommand", async () => {
      // ARRANGE
      const channel = createMockTextChannel({
        parentId: "9999999999999999999", // Wrong category
      } as any);

      const mockUser = { id: "user123" };
      const interaction = createMockInteraction({
        commandName: "pingteam",
        guildId: WORKSHOP_GUILD_ID,
        channel,
        options: {
          getSubcommand: vi.fn(() => "remove"),
          getString: vi.fn(() => "racheats"),
          getUser: vi.fn(() => mockUser),
        },
      });

      // ACT
      await pingteamSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(teamService.removeMemberByTeamName).toHaveBeenCalledWith("racheats", "user123");
      expect(interaction.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Removed"));
    });

    it("does not apply restrictions to create subcommand", async () => {
      // ARRANGE
      const channel = createMockTextChannel({
        parentId: "9999999999999999999", // Wrong category
      } as any);

      const interaction = createMockInteraction({
        commandName: "pingteam",
        guildId: WORKSHOP_GUILD_ID,
        channel,
        options: {
          getSubcommand: vi.fn(() => "create"),
          getString: vi.fn(() => "newteam"),
        },
      });

      // ACT
      await pingteamSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(teamService.createTeam).toHaveBeenCalledWith("newteam", "newteam", expect.any(String));
      expect(interaction.reply).toHaveBeenCalledWith('✅ Created team "newteam".');
    });
  });

  describe("guild restrictions", () => {
    it("denies all subcommands in non-allowed guilds", async () => {
      // ARRANGE
      const subcommands = ["ping", "add", "remove", "list", "create"];

      for (const subcommand of subcommands) {
        const interaction = createMockInteraction({
          commandName: "pingteam",
          guildId: "999999999999999999", // Different guild
          options: {
            getSubcommand: vi.fn(() => subcommand),
            getString: vi.fn(() => "testteam"),
            getUser: vi.fn(() => ({ id: "user123" })),
          },
        });

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(interaction.reply).toHaveBeenCalledWith({
          content: "You can't use this here.",
          flags: MessageFlags.Ephemeral,
        });

        // Ensure no service methods were called
        expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
        expect(teamService.addMemberByTeamName).not.toHaveBeenCalled();
        expect(teamService.removeMemberByTeamName).not.toHaveBeenCalled();
        expect(teamService.createTeam).not.toHaveBeenCalled();

        // Reset mocks for next iteration
        vi.restoreAllMocks();
        vi.mocked(teamService.getTeamMembersByName).mockResolvedValue([]);
        vi.mocked(teamService.addMemberByTeamName).mockResolvedValue();
        vi.mocked(teamService.removeMemberByTeamName).mockResolvedValue(true);
        vi.mocked(teamService.createTeam).mockResolvedValue({} as any);
      }
    });

    it("denies command in DMs", async () => {
      // ARRANGE
      const interaction = createMockInteraction({
        commandName: "pingteam",
        guildId: null, // DM - no guild ID
        options: {
          getSubcommand: vi.fn(() => "ping"),
          getString: vi.fn(() => "testteam"),
        },
      });

      // ACT
      await pingteamSlashCommand.execute(interaction, null as any);

      // ASSERT
      expect(interaction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
      expect(teamService.getTeamMembersByName).not.toHaveBeenCalled();
    });

    it("allows all subcommands in the allowed guild", async () => {
      // ARRANGE - Test ping subcommand
      const pingInteraction = createMockInteraction({
        commandName: "pingteam",
        guildId: WORKSHOP_GUILD_ID,
        channel: createMockTextChannel({} as any),
        options: {
          getSubcommand: vi.fn(() => "ping"),
          getString: vi.fn(() => "testteam"),
        },
      });

      (teamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

      // ACT
      await pingteamSlashCommand.execute(pingInteraction, null as any);

      // ASSERT
      expect(teamService.getTeamMembersByName).toHaveBeenCalledWith("testteam");
      expect(pingInteraction.reply).toHaveBeenCalledWith(
        "🔔 **testteam team ping:**\n<@user1> <@user2>",
      );

      // Reset for next test
      vi.restoreAllMocks();
      vi.mocked(teamService.createTeam).mockResolvedValue({} as any);

      // ARRANGE - Test create subcommand
      const createInteraction = createMockInteraction({
        commandName: "pingteam",
        guildId: WORKSHOP_GUILD_ID,
        options: {
          getSubcommand: vi.fn(() => "create"),
          getString: vi.fn(() => "newteam"),
        },
      });

      // ACT
      await pingteamSlashCommand.execute(createInteraction, null as any);

      // ASSERT
      expect(teamService.createTeam).toHaveBeenCalled();
      expect(createInteraction.reply).toHaveBeenCalledWith('✅ Created team "newteam".');
    });
  });
});
