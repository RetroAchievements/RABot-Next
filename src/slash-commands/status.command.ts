import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { COLORS } from "../config/constants";
import type { BotClient, SlashCommand } from "../models";
import { GithubReleaseService } from "../services/github-release.service";

const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Display bot status and statistics"),

  legacyName: "status",

  async execute(interaction) {
    const client = interaction.client as BotClient;
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    // Fetch the latest version from GitHub
    const version = await GithubReleaseService.fetchLatestVersion();

    // Format uptime.
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeString = [
      days > 0 ? `${days}d` : null,
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}m` : null,
      `${seconds}s`,
    ]
      .filter(Boolean)
      .join(" ");

    // Create embed.
    const embed = new EmbedBuilder()
      .setTitle("📊 RABot Status")
      .setColor(COLORS.PRIMARY)
      .setThumbnail(client.user!.displayAvatarURL())
      .addFields([
        {
          name: "📦 Version",
          value: version || "Unknown",
          inline: true,
        },
        {
          name: "⏱️ Uptime",
          value: uptimeString,
          inline: true,
        },
        {
          name: "💾 Memory Usage",
          value: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          inline: true,
        },
        {
          name: "📡 Latency",
          value: `${client.ws.ping}ms`,
          inline: true,
        },
        {
          name: "🏠 Servers",
          value: client.guilds.cache.size.toString(),
          inline: true,
        },
        {
          name: "👥 Total Users",
          value: (() => {
            let totalUsers = 0;
            for (const guild of client.guilds.cache.values()) {
              totalUsers += guild.memberCount;
            }

            return totalUsers.toLocaleString();
          })(),
          inline: true,
        },
        {
          name: "📝 Commands",
          value: client.commands.size.toString(),
          inline: true,
        },
        {
          name: "⚙️ Runtime",
          value: `Bun ${Bun.version}`,
          inline: true,
        },
        {
          name: "📚 Library",
          value: `Discord.js v14`,
          inline: true,
        },
        {
          name: "🎮 Prefix",
          value: `\`${client.commandPrefix}\``,
          inline: true,
        },
      ])
      .setFooter({ text: "RetroAchievements Discord Bot" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default statusCommand;
