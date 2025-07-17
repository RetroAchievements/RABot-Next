import { Collection } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

import type { SlashCommand } from "../models";
import { logError, logger } from "../utils/logger";

export async function loadSlashCommands(): Promise<Collection<string, SlashCommand>> {
  const commands = new Collection<string, SlashCommand>();
  const commandsPath = join(__dirname, "../slash-commands");

  try {
    const commandFiles = readdirSync(commandsPath).filter(
      (file) => file.endsWith(".command.ts") || file.endsWith(".command.js"),
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(filePath);
      const slashCommand: SlashCommand = command.default;

      if ("data" in slashCommand && "execute" in slashCommand) {
        commands.set(slashCommand.data.name, slashCommand);
        logger.debug(
          `Loaded slash command: /${slashCommand.data.name}${slashCommand.legacyName ? ` (legacy: ${slashCommand.legacyName})` : ""}`,
        );
      } else {
        logger.warn(
          `The slash command at ${filePath} is missing required "data" or "execute" property.`,
        );
      }
    }
  } catch (error) {
    logError(error, {
      event: "slash_command_load_error",
    });
  }

  return commands;
}
