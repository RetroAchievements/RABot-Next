import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";

const topicSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("topic")
    .setDescription("Display the current channel topic"),

  legacyName: "topic", // For migration mapping

  async execute(interaction, _client) {
    // Check if channel has a topic property
    const channel = interaction.channel;

    if (!channel || channel.type === ChannelType.DM || !("topic" in channel)) {
      await interaction.reply({
        content: "This command can only be used in text channels.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    const topic = channel.topic;

    if (!topic) {
      await interaction.reply({
        content: "This channel has no topic set.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.reply({
      content: `**Channel Topic:**\n${topic}`,
    });
  },
};

export default topicSlashCommand;
