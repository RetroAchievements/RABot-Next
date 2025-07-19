import type { CommandInteraction, Message } from "discord.js";

import { type LogContext, logError } from "./logger";

export interface ErrorContext extends LogContext {
  errorCode?: string;
  errorType?: string;
  stackTrace?: string;
  userAction?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Centralized error tracking and user-friendly error formatting.
 *
 * This system categorizes errors into two main buckets:
 * 1. Technical logging - Comprehensive error details for developers/administrators
 * 2. User messaging - Friendly, actionable error messages for Discord users
 *
 * The categorization strategy focuses on common Discord API errors and provides
 * specific guidance rather than generic "something went wrong" messages. Error IDs
 * allow users to report specific issues while maintaining security by not exposing
 * technical details in user-facing messages.
 */
export class ErrorTracker {
  /**
   * Track an error with full context from a Discord message.
   */
  static trackMessageError(
    error: Error | unknown,
    message: Message,
    commandName?: string,
    additionalContext?: Partial<ErrorContext>,
  ): void {
    const context: ErrorContext = {
      userId: message.author.id,
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      commandName: commandName || "unknown",
      messageId: message.id,
      userAction: "message_command",
      errorType: error instanceof Error ? error.name : "UnknownError",
      stackTrace: error instanceof Error ? error.stack : undefined,
      ...additionalContext,
    };

    logError(error, context);
  }

  /**
   * Track an error with full context from a Discord interaction.
   */
  static trackInteractionError(
    error: Error | unknown,
    interaction: CommandInteraction,
    additionalContext?: Partial<ErrorContext>,
  ): void {
    const context: ErrorContext = {
      userId: interaction.user.id,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      commandName: interaction.commandName,
      interactionId: interaction.id,
      userAction: "slash_command",
      errorType: error instanceof Error ? error.name : "UnknownError",
      stackTrace: error instanceof Error ? error.stack : undefined,
      ...additionalContext,
    };

    logError(error, context);
  }

  /**
   * Track a generic error with custom context.
   */
  static trackError(error: Error | unknown, context: ErrorContext): void {
    const fullContext: ErrorContext = {
      errorType: error instanceof Error ? error.name : "UnknownError",
      stackTrace: error instanceof Error ? error.stack : undefined,
      ...context,
    };

    logError(error, fullContext);
  }

  /**
   * Create a unique error ID for tracking purposes.
   *
   * Error IDs serve multiple purposes:
   * 1. Allow users to reference specific errors when reporting issues
   * 2. Help administrators correlate user reports with log entries
   * 3. Provide a sense of accountability ("we're tracking this")
   * 4. Enable error deduplication and trend analysis
   *
   * The format includes timestamp for chronological sorting and random suffix for uniqueness.
   */
  static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Format an error for user-friendly display with actionable guidance.
   *
   * Our error categorization strategy prioritizes user experience:
   * 1. Identify common, fixable issues (permissions, rate limits)
   * 2. Provide specific, actionable guidance when possible
   * 3. Use consistent emoji and formatting for visual recognition
   * 4. Include error IDs for issue tracking without exposing technical details
   *
   * We avoid generic "error occurred" messages in favor of specific guidance
   * that helps users understand what went wrong and how to potentially fix it.
   */
  static formatUserError(error: Error | unknown, errorId?: string): string {
    const id = errorId || ErrorTracker.generateErrorId();

    if (error instanceof Error) {
      /**
       * Permission errors are common and usually fixable by server administrators.
       * We provide specific guidance about checking bot permissions rather than
       * leaving users confused about what went wrong.
       */
      if (error.message.includes("Missing Access")) {
        return `❌ I don't have permission to perform this action. Please check my permissions.\n\`Error ID: ${id}\``;
      }

      /**
       * Message deletion errors happen frequently in active Discord servers.
       * Rather than showing cryptic "Unknown Message" errors, we explain the
       * likely cause in user-friendly terms.
       */
      if (error.message.includes("Unknown Message")) {
        return `❌ The message was deleted or I can't access it.\n\`Error ID: ${id}\``;
      }

      /**
       * Rate limit errors should encourage patience rather than retries.
       * We explain that this is temporary and suggest waiting rather than
       * repeatedly attempting the command.
       */
      if (error.message.includes("rate limit")) {
        return `❌ I'm being rate limited. Please try again in a moment.\n\`Error ID: ${id}\``;
      }
    }

    /**
     * Fallback for unknown errors maintains user confidence while providing
     * a reference for support. We avoid technical jargon and suggest the
     * issue may be temporary.
     */
    return `❌ An unexpected error occurred. Please try again later.\n\`Error ID: ${id}\``;
  }
}
