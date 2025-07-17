import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { CHEAT_INVESTIGATION_CATEGORY_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { TeamService } from "../services/team.service";

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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  cooldown: 30, // 30 seconds cooldown for team pings.

  async execute(interaction, _client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "ping": {
        const teamName = interaction.options.getString("team", true);

        // Check permissions for restricted teams
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

        // Check permissions for restricted teams
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
          allowedMentions: { parse: [] }, // Don't actually ping when listing
        });
        break;
      }

      case "create": {
        const teamName = interaction.options.getString("name", true);

        // Generate team ID from name (lowercase, no spaces)
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
