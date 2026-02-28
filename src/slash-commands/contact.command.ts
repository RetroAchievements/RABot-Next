import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { buildContactEmbed } from "../utils/build-contact-embed";

const contactSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("contact")
    .setDescription("How to contact the RetroAchievements staff"),

  legacyName: "contact", // For migration mapping

  async execute(interaction, _client) {
    const embed = buildContactEmbed();

    await interaction.reply({ embeds: [embed] });
  },
};

export default contactSlashCommand;
