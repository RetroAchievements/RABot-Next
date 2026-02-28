import { ChannelType, MessageFlags } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHEAT_INVESTIGATION_CATEGORY_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import { TeamService } from "../services/team.service";
import {
  createMockInteraction,
  createMockTextChannel,
  createMockThreadChannel,
} from "../test/mocks/discord.mock";
import pingteamSlashCommand from "./pingteam.command";

describe("SlashCommand: pingteam", () => {
  beforeEach(() => {
    // Spy on TeamService methods and provide default mock implementations.
    vi.spyOn(TeamService, "getTeamMembersByName").mockResolvedValue([]);
    vi.spyOn(TeamService, "addMemberByTeamName").mockResolvedValue();
    vi.spyOn(TeamService, "removeMemberByTeamName").mockResolvedValue(true);
    vi.spyOn(TeamService, "createTeam").mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Restore all spies to prevent test pollution.
    vi.restoreAllMocks();
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
        expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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
        expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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
        expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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

        (TeamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
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
          expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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
          expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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
          expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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

          (TeamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
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

          (TeamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
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

          (TeamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

          // ACT
          await pingteamSlashCommand.execute(interaction, null as any);

          // ASSERT
          expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("racheats");
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

        (TeamService.getTeamMembersByName as any).mockResolvedValue(["mod1", "mod2"]);

        // ACT
        await pingteamSlashCommand.execute(interaction, null as any);

        // ASSERT
        expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("moderators");
        expect(interaction.reply).toHaveBeenCalledWith(
          "🔔 **moderators team ping:**\n<@mod1> <@mod2>",
        );
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
      expect(TeamService.addMemberByTeamName).toHaveBeenCalledWith(
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
      expect(TeamService.removeMemberByTeamName).toHaveBeenCalledWith("racheats", "user123");
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
      expect(TeamService.createTeam).toHaveBeenCalledWith("newteam", "newteam", expect.any(String));
      expect(interaction.reply).toHaveBeenCalledWith('✅ Created team "newteam".');
    });
  });

  describe("guild restrictions", () => {
    it("denies all subcommands in non-allowed guilds", async () => {
      // ARRANGE
      const subcommands = ["ping", "add", "remove", "create"];

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
        expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
        expect(TeamService.addMemberByTeamName).not.toHaveBeenCalled();
        expect(TeamService.removeMemberByTeamName).not.toHaveBeenCalled();
        expect(TeamService.createTeam).not.toHaveBeenCalled();

        // Reset mocks for next iteration
        vi.restoreAllMocks();
        vi.spyOn(TeamService, "getTeamMembersByName").mockResolvedValue([]);
        vi.spyOn(TeamService, "addMemberByTeamName").mockResolvedValue();
        vi.spyOn(TeamService, "removeMemberByTeamName").mockResolvedValue(true);
        vi.spyOn(TeamService, "createTeam").mockResolvedValue({} as any);
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
      expect(TeamService.getTeamMembersByName).not.toHaveBeenCalled();
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

      (TeamService.getTeamMembersByName as any).mockResolvedValue(["user1", "user2"]);

      // ACT
      await pingteamSlashCommand.execute(pingInteraction, null as any);

      // ASSERT
      expect(TeamService.getTeamMembersByName).toHaveBeenCalledWith("testteam");
      expect(pingInteraction.reply).toHaveBeenCalledWith(
        "🔔 **testteam team ping:**\n<@user1> <@user2>",
      );

      // Reset for next test
      vi.restoreAllMocks();
      vi.spyOn(TeamService, "createTeam").mockResolvedValue({} as any);

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
      expect(TeamService.createTeam).toHaveBeenCalled();
      expect(createInteraction.reply).toHaveBeenCalledWith('✅ Created team "newteam".');
    });
  });
});
