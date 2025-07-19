import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";

/**
 * Utility function to enforce guild restrictions on slash commands.
 *
 * This provides a consistent, low-cognitive-load way to restrict commands
 * to specific Discord guilds. If the restriction fails, it automatically
 * sends an ephemeral error response to the user.
 *
 * @param interaction - The Discord slash command interaction
 * @param allowedGuildId - The guild ID where this command is allowed
 * @param errorMessage - Custom error message (optional)
 * @returns Promise<boolean> - true if restriction passes, false if it fails
 *
 * @example
 * ```typescript
 * if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) return;
 * ```
 */
export async function requireGuild(
  interaction: ChatInputCommandInteraction,
  allowedGuildId: string,
  errorMessage = "You can't use this here.",
): Promise<boolean> {
  if (interaction.guildId !== allowedGuildId) {
    await interaction.reply({
      content: errorMessage,
      flags: MessageFlags.Ephemeral,
    });

    return false;
  }

  return true;
}
