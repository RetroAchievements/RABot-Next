import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { CHEAT_INVESTIGATION_CATEGORY_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { TeamService } from "../services/team.service";
import { requireGuild } from "../utils/guild-restrictions";

/**
 * Team management and ping system.
 *
 * This command handles team organization, allowing administrators to create teams,
 * manage membership, and enable users to ping entire teams. Special security
 * measures are implemented for sensitive teams like RACheats (cheat investigation)
 * to prevent misuse and maintain confidentiality.
 *
 * The guild restriction ensures this sensitive functionality is only available
 * in the official RetroAchievements Discord server where proper moderation
 * and oversight can be maintained.
 */
const pingteamSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("pingteam")
    .setDescription("Team ping system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ping")
        .setDescription("Ping a team")
        .addStringOption((option) =>
          option
            .setName("team")
            .setDescription("Team name to ping")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a user to a team")
        .addStringOption((option) =>
          option
            .setName("team")
            .setDescription("Team name")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addUserOption((option) =>
          option.setName("user").setDescription("User to add to the team").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a user from a team")
        .addStringOption((option) =>
          option
            .setName("team")
            .setDescription("Team name")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addUserOption((option) =>
          option.setName("user").setDescription("User to remove from the team").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List members of a team")
        .addStringOption((option) =>
          option
            .setName("team")
            .setDescription("Team name")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new team")
        .addStringOption((option) =>
          option.setName("name").setDescription("Team name").setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 30-second cooldown prevents spam and reduces notification fatigue.
  // Team pings can be disruptive, so we limit frequency to encourage thoughtful usage.
  cooldown: 30,

  async execute(interaction, _client) {
    /**
     * Guild restriction for security and moderation.
     *
     * Team functionality involves sensitive operations like pinging groups of people
     * and managing membership. Restricting to the official RA Workshop Discord ensures:
     * - Proper administrator oversight and accountability
     * - Consistent moderation policies across team usage
     * - Prevention of bot abuse in unauthorized servers
     */
    if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "ping": {
        const teamName = interaction.options.getString("team", true);

        /**
         * Special restrictions for the RACheats team.
         *
         * RACheats handles sensitive cheat investigations that require confidentiality.
         * Restricting pings to the investigation category prevents:
         * - Accidental disclosure of ongoing investigations
         * - Inappropriate pings that could compromise confidential work
         * - Misuse of the team for non-investigation purposes
         *
         * The category restriction ensures discussions stay within proper channels
         * where appropriate context and confidentiality can be maintained.
         */
        if (teamName.toLowerCase() === "racheats") {
          if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
            await interaction.reply({
              content: "The RACheats team can't be pinged here.",
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          if (
            "parentId" in interaction.channel &&
            interaction.channel.parentId !== CHEAT_INVESTIGATION_CATEGORY_ID
          ) {
            await interaction.reply({
              content: "The RACheats team can't be pinged here.",
              flags: MessageFlags.Ephemeral,
            });

            return;
          }
        }

        const members = await TeamService.getTeamMembersByName(teamName);

        if (members.length === 0) {
          await interaction.reply({
            content: `No members found in team "${teamName}".`,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        // Convert user IDs to Discord mentions for the ping.
        const mentions = members.map((m) => `<@${m}>`).join(" ");
        await interaction.reply(`🔔 **${teamName} team ping:**\n${mentions}`);
        break;
      }

      case "add": {
        const teamName = interaction.options.getString("team", true);
        const user = interaction.options.getUser("user", true);

        try {
          await TeamService.addMemberByTeamName(teamName, user.id, interaction.user.id);

          await interaction.reply(`✅ Added ${user} to team "${teamName}".`);
        } catch (_error) {
          await interaction.reply({
            content: `Failed to add ${user} to team "${teamName}". They might already be a member.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
      }

      case "remove": {
        const teamName = interaction.options.getString("team", true);
        const user = interaction.options.getUser("user", true);

        const success = await TeamService.removeMemberByTeamName(teamName, user.id);

        if (success) {
          await interaction.reply(`✅ Removed ${user} from team "${teamName}".`);
        } else {
          await interaction.reply({
            content: `Failed to remove ${user} from team "${teamName}". They might not be a member.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
      }

      case "list": {
        const teamName = interaction.options.getString("team", true);

        /**
         * Same security restrictions as ping command for RACheats team.
         *
         * Even viewing team membership can be sensitive for investigation teams.
         * Knowing who is involved in cheat investigations could compromise
         * ongoing cases or create bias. The category restriction ensures
         * membership information is only visible in appropriate contexts.
         */
        if (teamName.toLowerCase() === "racheats") {
          if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
            await interaction.reply({
              content: "The RACheats team member list can't be viewed here.",
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          if (
            "parentId" in interaction.channel &&
            interaction.channel.parentId !== CHEAT_INVESTIGATION_CATEGORY_ID
          ) {
            await interaction.reply({
              content: "The RACheats team member list can't be viewed here.",
              flags: MessageFlags.Ephemeral,
            });

            return;
          }
        }

        const members = await TeamService.getTeamMembersByName(teamName);

        if (members.length === 0) {
          await interaction.reply({
            content: `No members found in team "${teamName}".`,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        const memberList = members.map((m) => `• <@${m}>`).join("\n");
        await interaction.reply({
          content: `**Members of ${teamName}:**\n${memberList}`,
          // Disable mentions when listing - we want to show usernames but not ping everyone.
          // This prevents accidental notification spam when viewing team membership.
          allowedMentions: { parse: [] },
        });
        break;
      }

      case "create": {
        const teamName = interaction.options.getString("name", true);

        /**
         * Generate team ID from display name for database consistency.
         *
         * We convert the human-readable name to a URL-safe, database-friendly ID:
         * - Lowercase for case-insensitive lookups
         * - Replace spaces with hyphens for readability
         * - This ensures consistent internal references while preserving display names
         *
         * Example: "RA Cheats" becomes "ra-cheats" as the internal ID
         */
        const teamId = teamName.toLowerCase().replace(/\s+/g, "-");

        const team = await TeamService.createTeam(teamId, teamName, interaction.user.id);

        if (team) {
          await interaction.reply(`✅ Created team "${teamName}".`);
        } else {
          await interaction.reply({
            content: `Failed to create team "${teamName}". It may already exist.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
      }
    }
  },
};

export default pingteamSlashCommand;
