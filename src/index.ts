import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import figlet from "figlet";

import { loadCommands } from "./commands";
import { LEGACY_COMMAND_PREFIX } from "./config/constants";
import { handleMessage } from "./handlers/message.handler";
import { loadSlashCommands } from "./handlers/slash-command.handler";
import type { BotClient, Command, SlashCommand } from "./models";
import { AdminChecker } from "./utils/admin-checker";
import { CommandAnalytics } from "./utils/command-analytics";
import { CooldownManager } from "./utils/cooldown-manager";
import { logError, logger } from "./utils/logger";

/**
 * Validates that all required environment variables are set.
 * Exits the process if any critical variables are missing.
 */
function validateEnvironment(): void {
  const requiredEnvVars = ["DISCORD_TOKEN", "DISCORD_APPLICATION_ID", "RA_WEB_API_KEY"];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    logger.fatal(`Missing required environment variables: ${missingVars.join(", ")}`);
    logger.fatal("Please check your .env file and ensure all required variables are set.");
    process.exit(1);
  }

  // Warn about optional but recommended variables.
  const optionalVars = ["MAIN_GUILD_ID", "WORKSHOP_GUILD_ID", "YOUTUBE_API_KEY"];

  for (const envVar of optionalVars) {
    if (!process.env[envVar]) {
      logger.warn(
        `Optional environment variable ${envVar} is not set. Some features may be limited.`,
      );
    }
  }
}

// Validate environment before starting.
validateEnvironment();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessagePolls,
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

  // Check for any UWC polls that may have ended while the bot was offline.
  try {
    const { checkExpiredUwcPolls } = await import("./utils/poll-checker");
    await checkExpiredUwcPolls(readyClient);
  } catch (error) {
    logError(error, { event: "uwc_poll_startup_check_error" });
  }

  // Debug: List loaded slash commands
  if (client.slashCommands.size > 0) {
    logger.debug("Slash commands loaded:");
    for (const [_name, cmd] of client.slashCommands) {
      logger.debug(`- /${cmd.data.name}${cmd.legacyName ? ` (legacy: !${cmd.legacyName})` : ""}`);
    }
  }

  // Check and leave unauthorized guilds.
  try {
    const { checkAndLeaveUnauthorizedGuilds } = await import("./utils/guild-manager");
    const guilds = Array.from(readyClient.guilds.cache.values());
    await checkAndLeaveUnauthorizedGuilds(guilds);
  } catch (error) {
    logError(error, { event: "guild_authorization_check_error" });
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

// Handle message updates (for poll completion).
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  // Import dynamically to avoid circular dependencies.
  const { handlePollUpdate } = await import("./handlers/poll-update.handler");
  await handlePollUpdate(oldMessage, newMessage);
});

// Handle thread creation (for UWC auto-detection).
client.on(Events.ThreadCreate, async (thread) => {
  // Import dynamically to avoid circular dependencies.
  const { handleUwcAutoDetect } = await import("./handlers/uwc-auto-detect.handler");
  await handleUwcAutoDetect(thread);
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

  // Check if user is an administrator.
  const isAdmin = AdminChecker.isAdminFromInteraction(interaction);

  // Check cooldowns with admin bypass.
  const remainingCooldown = CooldownManager.checkCooldownWithBypass(
    client.cooldowns,
    interaction.user.id,
    interaction.commandName,
    isAdmin,
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

// Graceful shutdown handling.
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Destroy the Discord client connection.
    client.destroy();
    logger.info("Discord client connection closed.");

    // Wait a moment for any pending operations.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info("Shutdown complete.");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle termination signals.
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors.
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal("Unhandled rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

client.login(process.env.DISCORD_TOKEN);
