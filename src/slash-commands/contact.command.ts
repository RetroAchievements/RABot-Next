import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { SlashCommand } from "../models";

const contactSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("contact")
    .setDescription("Show contact information for various RetroAchievements teams"),
  
  legacyName: "contact", // For migration mapping
  
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle("RetroAchievements Team Contact Information")
      .setColor(0x0099ff)
      .setDescription("Here's how to contact various RA teams:")
      .addFields(
        {
          name: "🛡️ RAdmin (Site Admins)",
          value: "For site administration issues\n`@RAdmin` on Discord",
          inline: true,
        },
        {
          name: "👮 RAmods (Moderators)",
          value: "For moderation concerns\n`@RAMods` on Discord",
          inline: true,
        },
        {
          name: "🔍 RACheats (Cheat Investigation)",
          value: "To report suspicious scores\n`@RACheats` on Discord",
          inline: true,
        },
        {
          name: "📰 RANews (News Team)",
          value: "For news submissions\n`@RANews` on Discord",
          inline: true,
        },
        {
          name: "🎮 RAEvents (Event Team)",
          value: "For event suggestions\n`@RAEvents` on Discord",
          inline: true,
        },
        {
          name: "💬 General Support",
          value: "Use the appropriate support channels or contact a moderator",
          inline: false,
        }
      )
      .setFooter({ 
        text: "Please use the appropriate team for your issue",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default contactSlashCommand;