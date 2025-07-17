import { Client, Events, GatewayIntentBits, Collection, MessageFlags } from "discord.js";
import figlet from "figlet";
import type { BotClient, Command, SlashCommand } from "./models";
import { loadCommands } from "./commands";
import { loadSlashCommands } from "./handlers/slash-command.handler";
import { handleMessage } from "./handlers/message.handler";
import { LEGACY_COMMAND_PREFIX } from "./config/constants";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as BotClient;

// Initialize command collections.
client.commands = new Collection<string, Command>();
client.slashCommands = new Collection<string, SlashCommand>();
client.commandPrefix = LEGACY_COMMAND_PREFIX;

// Display startup banner.
console.log(figlet.textSync("RABot", { font: "Big" }));
console.log("\n✨ The official RetroAchievements Discord bot\n");
console.log("🚀 Starting up...\n");

client.once(Events.ClientReady, async (readyClient) => {
  // Load commands.
  client.commands = await loadCommands();
  client.slashCommands = await loadSlashCommands();
  
  console.log(`📦 Loaded ${client.commands.size} prefix commands`);
  console.log(`🗲 Loaded ${client.slashCommands.size} slash commands`);
  
  // Debug: List loaded slash commands
  if (client.slashCommands.size > 0) {
    console.log("   Slash commands:");
    client.slashCommands.forEach((cmd) => {
      console.log(`   - /${cmd.data.name}${cmd.legacyName ? ` (legacy: !${cmd.legacyName})` : ""}`);
    });
  }
  console.log("");

  console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
  console.log(`🎮 Legacy command prefix: ${client.commandPrefix}`);
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

// Handle slash command interactions.
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.slashCommands.get(interaction.commandName);
    
    if (!command) {
      console.error(`No slash command matching ${interaction.commandName} was found.`);
      return;
    }

    // Handle autocomplete for pingteam command
    if (interaction.commandName === "pingteam") {
      const focusedOption = interaction.options.getFocused(true);
      
      if (focusedOption.name === "team") {
        try {
          // Import TeamService dynamically to avoid circular dependencies
          const { TeamService } = await import("./services/team.service");
          const teams = await TeamService.getAllTeams();
          
          const filtered = teams
            .filter(team => team.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
            .slice(0, 25); // Discord limits to 25 choices
          
          await interaction.respond(
            filtered.map(team => ({
              name: team.name,
              value: team.name,
            }))
          );
        } catch (error) {
          console.error("Error fetching teams for autocomplete:", error);
          await interaction.respond([]);
        }
      }
    }
    
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);

  if (!command) {
    console.error(`No slash command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    const errorMessage = "There was an error while executing this command!";
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
