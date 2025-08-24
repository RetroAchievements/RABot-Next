import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { GanService } from "../services/gan.service";
import { MESSAGES } from "../utils/messages";

const ganSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gan")
    .setDescription("Generate an achievement-news post template for a game")
    .addStringOption((option) =>
      option
        .setName("game-id")
        .setDescription("Game ID number (e.g. 14402) or RetroAchievements game URL")
        .setRequired(true),
    ),

  legacyName: "gan", // For migration mapping - using the most common alias

  async execute(interaction, _client) {
    await interaction.deferReply();

    const gameInput = interaction.options.getString("game-id", true);
    const result = await GanService.processGameId(gameInput, { variant: "gan" });

    if (result.success && result.template) {
      await interaction.editReply({
        content: MESSAGES.GAN_SLASH_TEMPLATE_SUCCESS(result.template),
      });
    } else {
      await interaction.editReply(result.error || MESSAGES.UNABLE_TO_GET_GAME_INFO(gameInput));
    }
  },
};

export default ganSlashCommand;
