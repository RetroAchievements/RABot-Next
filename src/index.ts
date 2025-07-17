import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import figlet from "figlet";
import type { BotClient, Command } from "./models";
import { loadCommands } from "./commands";
import { handleMessage } from "./handlers/messageHandler";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as BotClient;

// Initialize command collection.
client.commands = new Collection<string, Command>();
client.commandPrefix = process.env.COMMAND_PREFIX || "!";

// Display startup banner.
console.log(figlet.textSync("RABot", { font: "Big" }));
console.log("\n✨ The official RetroAchievements Discord bot\n");
console.log("🚀 Starting up...\n");

client.once(Events.ClientReady, async (readyClient) => {
  // Load commands.
  client.commands = await loadCommands();
  console.log(`📦 Loaded ${client.commands.size} commands\n`);

  console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
  console.log(`🎮 Command prefix: ${client.commandPrefix}`);
  console.log(
    `📊 Serving ${readyClient.guilds.cache.size} guild${readyClient.guilds.cache.size !== 1 ? "s" : ""}:`
  );

  readyClient.guilds.cache.forEach((guild) => {
    console.log(`   • ${guild.name} (${guild.memberCount} members)`);
  });

  console.log("");
});

// Handle messages.
client.on(Events.MessageCreate, async (message) => {
  await handleMessage(message, client);
});

client.login(process.env.DISCORD_TOKEN);
