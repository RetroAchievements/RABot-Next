import type { Message } from "discord.js";

import type { BotClient } from "../models";
import { AdminChecker } from "../utils/admin-checker";
import { CommandAnalytics } from "../utils/command-analytics";
import { CooldownManager } from "../utils/cooldown-manager";
import { logCommandExecution, logError, logMigrationNotice } from "../utils/logger";
import { sendMigrationNotice } from "../utils/migration-helper";

/**
 * Handles all Discord message events and processes legacy prefix commands.
 *
 * This handler implements the legacy command system while gracefully encouraging
 * migration to slash commands. The processing flow is carefully ordered:
 * 1. Basic validation (bot messages, prefix, parsing)
 * 2. Command lookup (by name or alias)
 * 3. Permission and cooldown validation
 * 4. Migration notice display (if slash equivalent exists)
 * 5. Command execution with comprehensive error handling
 *
 * The migration system ensures users see modern slash command alternatives while
 * maintaining backward compatibility during the transition period.
 */
export async function handleMessage(message: Message, client: BotClient): Promise<void> {
  // Ignore bot messages to prevent infinite loops and command spam.
  if (message.author.bot) return;

  // Early exit if message doesn't start with our command prefix.
  const prefix = client.commandPrefix || "!";
  if (!message.content.startsWith(prefix)) return;

  /**
   * Parse command and arguments from the message.
   *
   * We split on any whitespace (not just single spaces) to handle various
   * formatting styles users might use. The command name is normalized to
   * lowercase for case-insensitive matching.
   */
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  /**
   * Command lookup with alias support.
   *
   * We first check the primary command name, then fall back to aliases.
   * This allows users to use shortened versions or alternative names
   * (e.g., "h" for "help") while maintaining a single command implementation.
   */
  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases?.includes(commandName));

  if (!command) return;

  /**
   * Administrator detection for permission and cooldown bypass.
   *
   * Administrators can bypass cooldowns to perform emergency actions
   * and maintenance without being rate-limited. This prevents situations
   * where urgent moderation requires waiting for cooldowns to expire.
   */
  const isAdmin = AdminChecker.isAdminFromMessage(message);

  /**
   * Cooldown checking with admin bypass capability.
   *
   * Cooldowns prevent spam and reduce server load from expensive operations.
   * The admin bypass ensures moderators can always perform necessary actions
   * regardless of timing restrictions.
   */
  const remainingCooldown = CooldownManager.checkCooldownWithBypass(
    client.cooldowns,
    message.author.id,
    command.name,
    isAdmin,
    command.cooldown,
  );

  if (remainingCooldown > 0) {
    const cooldownMessage = CooldownManager.formatCooldownMessage(remainingCooldown);
    const reply = await message.reply(cooldownMessage);

    /**
     * Auto-delete cooldown messages to reduce chat clutter.
     *
     * Temporary messages prevent channels from being filled with
     * "please wait" messages while still providing user feedback.
     * We catch deletion errors to handle cases where the message
     * was already deleted by users or other bots.
     */
    setTimeout(
      () =>
        reply.delete().catch((error) => {
          logError(error, {
            event: "cooldown_message_delete_error",
            userId: message.author.id,
            guildId: message.guildId || undefined,
            channelId: message.channelId,
          });
        }),
      5000,
    );

    return;
  }

  /**
   * Migration system for encouraging slash command adoption.
   *
   * When users invoke legacy commands that have modern slash equivalents,
   * we show a temporary notice promoting the new version. This educational
   * approach helps users discover better UX while maintaining compatibility.
   *
   * The notice appears before command execution to maximize visibility,
   * but doesn't prevent the legacy command from working. This ensures
   * users aren't blocked while learning the new system.
   */
  const slashCommand = client.slashCommands.find((cmd) => {
    // Match the legacy command name with the slash command's declared legacy name.
    return cmd.legacyName === commandName;
  });

  if (slashCommand) {
    logMigrationNotice(
      commandName,
      slashCommand.data.name,
      message.author.id,
      message.guildId || undefined,
    );

    /**
     * Display migration notice with temporary visibility.
     *
     * The 15-second auto-deletion prevents channel clutter while giving
     * users enough time to read the suggestion. We use simple temporary
     * messages rather than ephemeral buttons to work in all channel types.
     */
    try {
      await sendMigrationNotice(message, slashCommand.data.name, {
        executeAfterNotice: true,
        deleteAfter: 15000,
        useEphemeralButton: false,
      });
    } catch (error) {
      logError(error, {
        event: "migration_notice_error",
        legacyCommand: commandName,
        slashCommand: slashCommand.data.name,
        userId: message.author.id,
        guildId: message.guildId || undefined,
      });
    }
  }

  // Start tracking command execution
  const startTime = CommandAnalytics.startTracking();

  try {
    // Log command execution
    logCommandExecution(
      command.name,
      message.author.id,
      message.guildId || undefined,
      message.channelId,
    );

    /**
     * Multi-layered permission validation.
     *
     * We check permissions in a specific order for security and user experience:
     * 1. User permissions (Discord ACL) - fast, built-in validation
     * 2. Bot permissions - prevents runtime errors from missing bot perms
     * 3. Custom permissions - allows complex business logic validation
     *
     * This layered approach provides clear error messages and prevents
     * expensive custom logic from running on users who lack basic permissions.
     */
    if (command.permissions) {
      // Validate user has required Discord permissions.
      if (command.permissions.user && message.guild) {
        const member = message.guild.members.cache.get(message.author.id);
        if (!member || !member.permissions.has(command.permissions.user)) {
          await message.reply("You don't have permission to use this command.");

          return;
        }
      }

      /**
       * Validate bot has necessary permissions before attempting execution.
       *
       * This prevents cryptic "Unknown Error" messages when the bot lacks
       * permissions like "Send Messages" or "Manage Roles". Early validation
       * provides clearer feedback to users about what's wrong.
       */
      if (command.permissions.bot && message.guild) {
        const botMember = message.guild.members.cache.get(client.user!.id);
        if (!botMember || !botMember.permissions.has(command.permissions.bot)) {
          await message.reply("I don't have the required permissions to execute this command.");

          return;
        }
      }

      /**
       * Execute custom permission logic for complex business rules.
       *
       * This allows commands to implement context-specific validation like
       * team membership checks, channel restrictions, or time-based permissions
       * that can't be expressed through Discord's standard permission system.
       */
      if (command.permissions.custom && !command.permissions.custom(message)) {
        await message.reply("You don't have permission to use this command.");

        return;
      }
    }

    // Execute the command with parsed arguments and client context.
    await command.execute(message, args, client);

    /**
     * Set cooldown only after successful execution.
     *
     * This prevents cooldowns from being applied when commands fail,
     * allowing users to retry failed commands immediately rather than
     * waiting for a cooldown period after an error they didn't cause.
     */
    CooldownManager.setCooldown(client.cooldowns, message.author.id, command.name);

    // Track successful execution for analytics and monitoring.
    CommandAnalytics.trackLegacyCommand(message, command.name, startTime, true);
  } catch (error) {
    /**
     * Comprehensive error logging with context.
     *
     * We capture all relevant context (user, guild, channel, message) to help
     * with debugging and understanding usage patterns. This information is
     * crucial for identifying systemic issues vs one-off errors.
     */
    logError(error, {
      commandName,
      userId: message.author.id,
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      messageId: message.id,
    });

    // Track failure for analytics and reliability monitoring.
    CommandAnalytics.trackLegacyCommand(message, command.name, startTime, false, error as Error);

    /**
     * Provide generic error message to users.
     *
     * We avoid exposing technical details to prevent information leakage
     * while still acknowledging that something went wrong. Detailed error
     * information is available in logs for administrators.
     */
    await message.reply("There was an error executing that command.");
  }
}
