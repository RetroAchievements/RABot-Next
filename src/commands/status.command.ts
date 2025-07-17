import { EmbedBuilder } from "discord.js";
import type { Command } from "../models";
import { COLORS } from "../config/constants";

const statusCommand: Command = {
  name: "status",
  aliases: ["info", "stats"],
  description: "Display bot status and statistics",
  usage: "!status",
  category: "utility",
  
  async execute(message, args, client) {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Format uptime.
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const uptimeString = [
      days > 0 ? `${days}d` : null,
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}m` : null,
      `${seconds}s`
    ].filter(Boolean).join(" ");
    
    // Create embed.
    const embed = new EmbedBuilder()
      .setTitle("📊 RABot Status")
      .setColor(COLORS.PRIMARY)
      .setThumbnail(client.user!.displayAvatarURL())
      .addFields([
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
          value: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString(),
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
    
    await message.reply({ embeds: [embed] });
  },
};

export default statusCommand;