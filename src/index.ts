import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import figlet from "figlet";

import { loadCommands } from "./commands";
import { LEGACY_COMMAND_PREFIX } from "./config/constants";
import { handleMessage } from "./handlers/message.handler";
import { loadSlashCommands } from "./handlers/slash-command.handler";
import type { BotClient, Command, SlashCommand } from "./models";
import { CommandAnalytics } from "./utils/command-analytics";
import { CooldownManager } from "./utils/cooldown-manager";
import { logError, logger } from "./utils/logger";

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
client.cooldowns = new Collection<string, Collection<string, number>>();
client.commandPrefix = LEGACY_COMMAND_PREFIX;

// Display startup banner.
console.log(figlet.textSync("RABot", { font: "Big" }));
console.log("\n✨ The official RetroAchievements Discord bot\n");
console.log("🚀 Starting up...\n");

client.once(Events.ClientReady, async (readyClient) => {
  // Load commands.
  client.commands = await loadCommands();
  client.slashCommands = await loadSlashCommands();

  logger.info(`📦 Loaded ${client.commands.size} prefix commands`);
  logger.info(`🗲 Loaded ${client.slashCommands.size} slash commands`);

  // Debug: List loaded slash commands
  if (client.slashCommands.size > 0) {
    logger.debug("Slash commands loaded:");
    for (const [_name, cmd] of client.slashCommands) {
      logger.debug(`- /${cmd.data.name}${cmd.legacyName ? ` (legacy: !${cmd.legacyName})` : ""}`);
    }
  }

  logger.info(`✅ Ready! Logged in as ${readyClient.user.tag}`);
  logger.info(`🎮 Legacy command prefix: ${client.commandPrefix}`);
  logger.info(
    `📊 Serving ${readyClient.guilds.cache.size} guild${readyClient.guilds.cache.size !== 1 ? "s" : ""}`,
  );

  for (const [_id, guild] of readyClient.guilds.cache) {
    logger.info(`• ${guild.name} (${guild.memberCount} members)`);
  }

  // Set up periodic cooldown cleanup (every 10 minutes).
  setInterval(() => {
    const cleaned = CooldownManager.cleanupExpiredCooldowns(client.cooldowns);
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cooldowns`);
    }
  }, 600000); // 10 minutes.
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
      logger.error(`No slash command matching ${interaction.commandName} was found.`);

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
            .filter((team) => team.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
            .slice(0, 25); // Discord limits to 25 choices

          await interaction.respond(
            filtered.map((team) => ({
              name: team.name,
              value: team.name,
            })),
          );
        } catch (error) {
          logError(error, {
            event: "autocomplete_error",
            commandName: "pingteam",
            userId: interaction.user.id,
            guildId: interaction.guildId || undefined,
          });
          await interaction.respond([]);
        }
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);

  if (!command) {
    logger.error(`No slash command matching ${interaction.commandName} was found.`);

    return;
  }

  // Check cooldowns.
  const remainingCooldown = CooldownManager.checkCooldown(
    client.cooldowns,
    interaction.user.id,
    interaction.commandName,
    command.cooldown,
  );

  if (remainingCooldown > 0) {
    const cooldownMessage = CooldownManager.formatCooldownMessage(remainingCooldown);
    await interaction.reply({ content: cooldownMessage, flags: MessageFlags.Ephemeral });

    return;
  }

  // Start tracking command execution
  const startTime = CommandAnalytics.startTracking();

  try {
    await command.execute(interaction, client);

    // Set cooldown after successful execution.
    CooldownManager.setCooldown(client.cooldowns, interaction.user.id, interaction.commandName);

    // Track successful command execution
    CommandAnalytics.trackSlashCommand(interaction, startTime, true);
  } catch (error) {
    logError(error, {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      interactionId: interaction.id,
    });

    // Track failed command execution
    CommandAnalytics.trackSlashCommand(interaction, startTime, false, error as Error);

    const errorMessage = "There was an error while executing this command!";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
