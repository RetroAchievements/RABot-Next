import type { Client, Collection } from "discord.js";

import type { Command } from "./command.model";
import type { SlashCommand } from "./slash-command.model";

/**
 * Extended Discord client with bot-specific properties and collections.
 *
 * This interface extends the base Discord.js Client with additional properties
 * needed for command handling, cooldown management, and dual command system
 * support. It serves as the central state container for the bot's runtime data.
 */
export interface BotClient extends Client {
  /**
   * Collection of loaded legacy prefix commands indexed by command name.
   * Used for quick lookup during message processing.
   */
  commands: Collection<string, Command>;

  /**
   * Collection of loaded slash commands indexed by command name.
   * Used for quick lookup during interaction processing.
   */
  slashCommands: Collection<string, SlashCommand>;

  /**
   * The prefix string used for legacy commands (e.g., "!" for !command).
   * Configurable via environment variables to allow different prefixes
   * in different deployment environments.
   */
  commandPrefix: string;

  /**
   * Nested cooldown tracking structure: command name -> user ID -> timestamp.
   *
   * This design allows per-user, per-command cooldowns while maintaining
   * efficient cleanup of expired entries. The timestamp represents when
   * the user can next use that command.
   */
  cooldowns: Collection<string, Collection<string, number>>;
}
