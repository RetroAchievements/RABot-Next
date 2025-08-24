import type { Command } from "../models";
import { GanService } from "../services/gan.service";
import { MESSAGES } from "../utils/messages";

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
      await message.reply(MESSAGES.GAN_USAGE_EXAMPLE);

      return;
    }

    const gameInput = args[0];
    const sentMsg = await message.reply(MESSAGES.GETTING_GAME_INFO(gameInput));

    const result = await GanService.processGameId(gameInput, { variant: "gan" });

    if (result.success && result.template) {
      await sentMsg.edit(MESSAGES.GAN_TEMPLATE_SUCCESS(message.author.toString(), result.template));
    } else {
      await sentMsg.edit(result.error || MESSAGES.UNABLE_TO_GET_GAME_INFO(gameInput));
    }
  },
};

export default ganCommand;
