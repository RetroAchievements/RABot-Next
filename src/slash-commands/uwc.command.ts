import {
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { requireGuild } from "../utils/guild-restrictions";

const UWC_ROLE_ID = "1002687198757388299";

const uwcSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("uwc").setDescription("Create an Unwelcome Concept poll"),

  async execute(interaction, _client) {
    /**
     * Guild restriction for security and moderation.
     *
     * UWC polls are part of the RetroAchievements Workshop process and should
     * only be available in the official Workshop Discord server where proper
     * oversight and context can be maintained.
     */
    if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) {
      return;
    }

    // Check if user has permission (specific role or administrator).
    const member = interaction.member;
    if (!member) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    const hasRequiredRole = (member as GuildMember)?.roles?.cache?.has(UWC_ROLE_ID) ?? false;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!hasRequiredRole && !isAdmin) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // Create the poll.
    await interaction.reply({
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
        duration: 72, // 3 days in hours.
      },
    });
  },
};

export default uwcSlashCommand;
