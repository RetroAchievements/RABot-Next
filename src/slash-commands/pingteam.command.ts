import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";

import { CHEAT_INVESTIGATION_CATEGORY_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { TeamService } from "../services/team.service";
import { requireGuild } from "../utils/guild-restrictions";

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
        .setName("create")
        .setDescription("Create a new team")
        .addStringOption((option) =>
          option.setName("name").setDescription("Team name").setRequired(true),
        ),
    ),

  // Team pings can be disruptive, so we rate limit to encourage thoughtful usage.
  cooldown: 30,

  async execute(interaction, _client) {
    if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "ping": {
        const teamName = interaction.options.getString("team", true);

        // RACheats pings are restricted to the investigation category to prevent accidental disclosure.
        if (teamName.toLowerCase() === "racheats") {
          if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
            await interaction.reply({
              content: "The RACheats team can't be pinged here.",
              flags: MessageFlags.Ephemeral,
            });

            return;
          }

          let categoryId: string | null = null;

          if (
            interaction.channel.type === ChannelType.PublicThread ||
            interaction.channel.type === ChannelType.PrivateThread ||
            interaction.channel.type === ChannelType.AnnouncementThread
          ) {
            // For threads, the category is on the parent channel's parentId.
            categoryId = interaction.channel.parent?.parentId ?? null;
          } else if ("parentId" in interaction.channel) {
            categoryId = interaction.channel.parentId;
          }

          if (categoryId !== CHEAT_INVESTIGATION_CATEGORY_ID) {
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
        } catch {
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

      case "create": {
        const teamName = interaction.options.getString("name", true);

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
