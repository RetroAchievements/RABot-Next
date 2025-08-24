import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { GanService } from "../services/gan.service";
import { MESSAGES } from "../utils/messages";

const gan2SlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gan2")
    .setDescription("Generate a pretty achievement-news post with colored formatting")
    .addStringOption((option) =>
      option
        .setName("game-id")
        .setDescription("Game ID number (e.g. 14402) or RetroAchievements game URL")
        .setRequired(true),
    ),

  async execute(interaction, _client) {
    await interaction.deferReply();

    const gameInput = interaction.options.getString("game-id", true);
    const result = await GanService.processGameId(gameInput, {
      variant: "gan2",
      user: interaction.user,
    });

    if (result.success && result.output) {
      await interaction.editReply(result.output);
    } else {
      await interaction.editReply(result.error || MESSAGES.UNABLE_TO_GET_GAME_INFO(gameInput));
    }
  },
};

export default gan2SlashCommand;
