import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { fetchGanData } from "../utils/fetch-gan-data";
import { logError } from "../utils/logger";

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

    // Extract game ID from argument.
    const gameId = GameInfoService.extractGameId(gameInput);
    if (!gameId) {
      await interaction.editReply(
        "Invalid game ID or URL format. Please provide a game ID number or a RetroAchievements game URL.",
      );

      return;
    }

    try {
      const ganData = await fetchGanData(gameId);
      if (!ganData) {
        await interaction.editReply(
          `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
        );

        return;
      }

      const output = TemplateService.generateGan2Template(
        ganData.gameInfo,
        ganData.achievementSetDate,
        ganData.youtubeLink,
        ganData.gameId,
        interaction.user,
      );

      await interaction.editReply(output);
    } catch (error) {
      logError("Error in gan2 slash command:", { error });
      await interaction.editReply(
        `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
      );
    }
  },
};

export default gan2SlashCommand;
