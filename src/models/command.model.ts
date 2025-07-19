import type { Message } from "discord.js";

import type { BotClient } from "./bot-client.model";
import type { CommandCategory } from "./command-category.model";

/**
 * Interface for legacy prefix commands (e.g., !command).
 *
 * This interface represents the older command system that uses message prefixes.
 * It's being phased out in favor of Discord's slash commands but is maintained
 * for backward compatibility during the migration period.
 *
 * The permission system is designed to be flexible and layered:
 * - Discord permissions (user/bot) for standard Discord ACL
 * - Custom functions for complex business logic (e.g., team-specific restrictions)
 * - Multiple permission types can be combined for fine-grained control
 *
 * @deprecated Use SlashCommand interface instead for new commands. Legacy commands
 * are maintained only for backward compatibility during the migration period.
 */
export interface Command {
  /** The primary command name used for invocation (without prefix). */
  name: string;

  /** Human-readable description of what this command does. */
  description: string;

  /** Usage string showing how to invoke the command with parameters. */
  usage: string;

  /** Category for organizing commands in help systems and documentation. */
  category: CommandCategory;

  /**
   * Main command execution function.
   *
   * @param message - The Discord message that triggered this command
   * @param args - Command arguments parsed from the message (excluding command name)
   * @param client - Extended Discord client with bot-specific properties
   */
  execute: (message: Message, args: string[], client: BotClient) => Promise<void>;

  /**
   * Alternative names that can be used to invoke this command.
   * Useful for abbreviations or common typos.
   */
  aliases?: string[];

  /**
   * Example usage strings to help users understand complex commands.
   * Displayed in help text and error messages.
   */
  examples?: string[];

  /**
   * Multi-layered permission system for command access control.
   *
   * This design allows for both simple Discord permission checks and complex
   * business logic validation. All permission types are optional and are
   * combined with AND logic (all must pass for command execution).
   */
  permissions?: {
    /**
     * Discord user permissions required to run this command.
     * Uses Discord.js permission bit flags.
     */
    user?: bigint[];

    /**
     * Discord permissions the bot needs to execute this command.
     * Prevents runtime errors when bot lacks necessary permissions.
     */
    bot?: bigint[];

    /**
     * Custom permission function for business logic validation.
     *
     * This allows for context-specific checks like team membership,
     * channel restrictions, or time-based permissions that can't be
     * expressed through Discord's standard permission system.
     *
     * @param message - The message context for permission evaluation
     * @returns true if permission is granted, false otherwise
     */
    custom?: (message: Message) => boolean;
  };

  /**
   * Cooldown period in seconds before this command can be used again.
   * Prevents spam and reduces server load for expensive operations.
   */
  cooldown?: number;
}
