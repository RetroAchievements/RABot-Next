import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/**
 * Interface for modern Discord slash commands (e.g., /command).
 *
 * This interface represents the new command system using Discord's native
 * slash command framework. These commands provide better user experience
 * through autocompletion, validation, and ephemeral responses.
 *
 * The migration system allows gradual transition from legacy prefix commands
 * by maintaining references to old command names while promoting new slash
 * command usage.
 */
export interface SlashCommand {
  /**
   * Discord.js command builder containing the command definition.
   *
   * This defines the command name, description, options, and validation rules
   * that Discord will enforce client-side. The union type accommodates
   * different command structures (simple commands, commands with options,
   * commands with subcommands).
   */
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

  /**
   * Main command execution function for slash command interactions.
   *
   * Unlike legacy commands, slash commands receive structured interaction
   * objects with parsed options rather than raw string arguments.
   *
   * @param interaction - The Discord slash command interaction
   * @param client - Discord client instance for additional API access
   */
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<void>;

  /**
   * Name of the equivalent legacy prefix command, if one exists.
   *
   * When users invoke a legacy command that has a slash equivalent, the bot
   * shows a migration notice encouraging them to use the modern version.
   * This property links the two command systems during the transition period.
   */
  legacyName?: string;

  /**
   * Cooldown period in seconds before this command can be used again.
   *
   * Slash commands use the same cooldown system as legacy commands to
   * maintain consistent rate limiting across both command types.
   */
  cooldown?: number;
}
