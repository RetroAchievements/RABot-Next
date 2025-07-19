import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { FramesService } from "../services/frames.service";

const framesSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("frames")
    .setDescription("Converts between time and frames at different frame rates")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription(
          "Time (e.g. '1h 30min') or frames (e.g. '3600' or '0xFF') with optional FPS",
        )
        .setRequired(true),
    ),

  legacyName: "frames", // For migration mapping

  async execute(interaction, _client) {
    const input = interaction.options.getString("input", true);
    const result = FramesService.processInput(input);

    if (!result) {
      await interaction.reply({
        content: `Invalid format: \`${input}\`\n\nExamples:\n• \`1h 5min 15s\` - time at 60 FPS (default)\n• \`500ms 30fps\` - time at 30 FPS\n• \`40\` - 40 frames at 60 FPS\n• \`0xFF 25fps\` - 255 frames (hex) at 25 FPS`,
        ephemeral: true,
      });

      return;
    }

    await interaction.reply(result);
  },
};

export default framesSlashCommand;
