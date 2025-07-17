import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { YouTubeService } from "../services/youtube.service";
import { logError } from "../utils/logger";

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

    // Extract game ID from argument.
    const gameId = GameInfoService.extractGameId(gameInput);
    if (!gameId) {
      await interaction.editReply(
        "Invalid game ID or URL format. Please provide a game ID number or a RetroAchievements game URL.",
      );

      return;
    }

    try {
      // Fetch game info.
      const gameInfo = await GameInfoService.fetchGameInfo(gameId);
      if (!gameInfo) {
        await interaction.editReply(
          `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
        );

        return;
      }

      // Get achievement date and YouTube link.
      const achievementSetDate = GameInfoService.getMostRecentAchievementDate(gameInfo);
      const youtubeLink = await YouTubeService.searchLongplay(gameInfo.title, gameInfo.consoleName);

      // Generate template.
      const template = TemplateService.generateGanTemplate(
        gameInfo,
        achievementSetDate,
        youtubeLink,
        gameId,
      );

      await interaction.editReply({
        content: `Here's your achievement-news post template:\n${template}`,
      });
    } catch (error) {
      logError("Error in gan slash command:", { error });
      await interaction.editReply(
        `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
      );
    }
  },
};

export default ganSlashCommand;
