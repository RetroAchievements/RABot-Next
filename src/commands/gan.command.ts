import type { Command } from "../models";
import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { fetchGanData } from "../utils/fetch-gan-data";
import { logError } from "../utils/logger";

const ganCommand: Command = {
  name: "genachnews",
  aliases: ["gan"],
  description: "Generate an achievement-news post template for the given game ID",
  usage: "!gan <gameId|gameUrl>",
  examples: ["!gan 4650", "!gan https://retroachievements.org/game/4650"],
  category: "retroachievements",
  cooldown: 3, // 3 seconds default cooldown.

  async execute(message, args) {
    if (!args[0]) {
      await message.reply("Please provide a game ID or URL. Example: `!gan 4650`");

      return;
    }

    // Extract game ID from argument.
    const gameId = GameInfoService.extractGameId(args[0]);
    if (!gameId) {
      await message.reply("Invalid game ID or URL format.");

      return;
    }

    const sentMsg = await message.reply(
      `:hourglass: Getting info for game ID \`${gameId}\`, please wait...`,
    );

    try {
      const ganData = await fetchGanData(gameId);
      if (!ganData) {
        await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);

        return;
      }

      const template = TemplateService.generateGanTemplate(
        ganData.gameInfo,
        ganData.achievementSetDate,
        ganData.youtubeLink,
        ganData.gameId,
      );

      await sentMsg.edit(
        `${message.author}, here's your achievement-news post template:\n${template}`,
      );
    } catch (error) {
      logError("Error in gan command:", { error });
      await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
    }
  },
};

export default ganCommand;
