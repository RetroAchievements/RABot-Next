import type { Command } from "../models";
import { GameInfoService } from "../services/game-info.service";
import { TemplateService } from "../services/template.service";
import { YouTubeService } from "../services/youtube.service";
import { logError } from "../utils/logger";

const gan2Command: Command = {
  name: "gan2",
  description: "Generate a pretty achievement-news post for the given game ID",
  usage: "!gan2 <gameId|gameUrl>",
  examples: ["!gan2 4650", "!gan2 https://retroachievements.org/game/4650"],
  category: "retroachievements",

  async execute(message, args) {
    if (!args[0]) {
      await message.reply("Please provide a game ID or URL. Example: `!gan2 4650`");

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
      // Fetch game info.
      const gameInfo = await GameInfoService.fetchGameInfo(gameId);
      if (!gameInfo) {
        await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);

        return;
      }

      // Get achievement date and YouTube link.
      const achievementSetDate = GameInfoService.getMostRecentAchievementDate(gameInfo);
      const youtubeLink = await YouTubeService.searchLongplay(gameInfo.title, gameInfo.consoleName);

      // Generate template.
      const output = TemplateService.generateGan2Template(
        gameInfo,
        achievementSetDate,
        youtubeLink,
        gameId,
        message.author,
      );

      // Delete the loading message and send the formatted output.
      await sentMsg.delete();

      if ("send" in message.channel) {
        await message.channel.send(output);
      }
    } catch (error) {
      logError("Error in gan2 command:", { error });
      await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
    }
  },
};

export default gan2Command;
