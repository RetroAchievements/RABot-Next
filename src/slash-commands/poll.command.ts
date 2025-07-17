import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { EMOJI_ALPHABET } from "../utils/poll-constants";

const pollSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a simple poll")
    .addStringOption((option) =>
      option.setName("question").setDescription("The poll question").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("option1").setDescription("First option").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("option2").setDescription("Second option").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("option3").setDescription("Third option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option4").setDescription("Fourth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option5").setDescription("Fifth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option6").setDescription("Sixth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option7").setDescription("Seventh option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option8").setDescription("Eighth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option9").setDescription("Ninth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option10").setDescription("Tenth option").setRequired(false),
    ),

  legacyName: "poll", // For migration mapping

  async execute(interaction, _client) {
    await interaction.deferReply();

    const question = interaction.options.getString("question", true);

    // Collect all options
    const options: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) {
        options.push(option);
      }
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options);
    if (uniqueOptions.size !== options.length) {
      await interaction.editReply("Poll error: duplicate options found!");

      return;
    }

    // Build poll message
    const reactions = Object.values(EMOJI_ALPHABET).slice(0, options.length);
    let optionsText = "";

    for (let i = 0; i < options.length; i++) {
      optionsText += `\n${reactions[i]} ${options[i]}`;
    }

    const pollMsg = [
      `__*${interaction.user} started a poll*__:`,
      `\n:bar_chart: **${question}**\n${optionsText}`,
    ];

    // Send the poll message
    const sentMsg = await interaction.editReply(pollMsg.join("\n"));

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      const emoji = reactions[i];
      if (emoji) {
        await sentMsg.react(emoji);
      }
    }
  },
};

export default pollSlashCommand;
