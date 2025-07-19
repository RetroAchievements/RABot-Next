import type { Command } from "../models";
import { DadjokeService } from "../services/dadjoke.service";

const dadjokeCommand: Command = {
  name: "dadjoke",
  description: "Get a random dad joke",
  usage: "!dadjoke",
  category: "general",
  cooldown: 3, // 3 seconds cooldown.

  async execute(message) {
    const joke = await DadjokeService.fetchRandomJoke();

    if (!joke) {
      await message.reply("Sorry, I couldn't fetch a dad joke right now. Try again later!");

      return;
    }

    await message.reply(joke);
  },
};

export default dadjokeCommand;
