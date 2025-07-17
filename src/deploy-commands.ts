import { REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

import { DISCORD_APPLICATION_ID, DISCORD_TOKEN } from "./config/constants";
import type { SlashCommand } from "./models";

// Check required environment variables.
if (!DISCORD_TOKEN) {
  console.error("❌ Error: DISCORD_TOKEN is not set in your .env file");
  process.exit(1);
}

if (!DISCORD_APPLICATION_ID) {
  console.error("❌ Error: DISCORD_APPLICATION_ID is not set in your .env file");
  console.error("You can find your bot's application ID in the Discord Developer Portal");
  process.exit(1);
}

const commands = [];
const commandsPath = join(__dirname, "slash-commands");

(async () => {
  try {
    const commandFiles = readdirSync(commandsPath).filter(
      (file) => file.endsWith(".command.ts") || file.endsWith(".command.js"),
    );

    // Load all slash commands.
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const module = await import(filePath);
      const slashCommand: SlashCommand = module.default;

      if ("data" in slashCommand && "execute" in slashCommand) {
        commands.push(slashCommand.data.toJSON());
      }
    }
  } catch (_error) {
    console.log("📁 No slash commands found in src/slash-commands/");
    console.log("Create slash command files ending with .command.ts to deploy them.");
    process.exit(0);
  }

  console.log(`📦 Found ${commands.length} slash commands`);

  // Construct and prepare an instance of the REST module.
  const rest = new REST().setToken(DISCORD_TOKEN);

  // Deploy commands.
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild.
    const data = await rest.put(Routes.applicationCommands(DISCORD_APPLICATION_ID), {
      body: commands,
    });

    console.log(
      `✅ Successfully reloaded ${(data as unknown as { length: number }).length} application (/) commands.`,
    );
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
