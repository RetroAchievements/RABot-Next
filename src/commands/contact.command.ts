import type { Command } from "../models";
import { buildContactEmbed } from "../utils/build-contact-embed";
import { logError } from "../utils/logger";
import { MessageFlags } from "discord.js";

const contactCommand: Command = {
  name: "contact",
  aliases: ["contactus", "contact-us"],
  description: "How to contact the RetroAchievements staff",
  usage: "!contact",
  category: "utility",

  async execute(message) {
    const embed = buildContactEmbed();

    try {
      await message.react("\u{1F4E7}");
      await message.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logError(error, {
        event: "contact_command_react_error",
        userId: message.author.id,
        guildId: message.guildId,
        channelId: message.channelId,
      });
      await message.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    }
  },
};

export default contactCommand;
