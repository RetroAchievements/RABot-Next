import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { DadjokeService } from "../services/dadjoke.service";

const dadjokeSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("dadjoke").setDescription("Get a random dad joke"),

  legacyName: "dadjoke", // For migration mapping.

  cooldown: 3, // 3 seconds cooldown.

  async execute(interaction, _client) {
    await interaction.deferReply();

    const joke = await DadjokeService.fetchRandomJoke();

    if (!joke) {
      await interaction.editReply("Sorry, I couldn't fetch a dad joke right now. Try again later!");

      return;
    }

    await interaction.editReply(joke);
  },
};

export default dadjokeSlashCommand;
