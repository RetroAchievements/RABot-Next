import type { CommandInteraction, Message } from "discord.js";

import { type LogContext, logError } from "./logger";

export interface ErrorContext extends LogContext {
  errorCode?: string;
  errorType?: string;
  stackTrace?: string;
  userAction?: string;
  additionalData?: Record<string, unknown>;
}

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
   */
  static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Format an error for user-friendly display.
   */
  static formatUserError(error: Error | unknown, errorId?: string): string {
    const id = errorId || ErrorTracker.generateErrorId();

    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes("Missing Access")) {
        return `❌ I don't have permission to perform this action. Please check my permissions.\n\`Error ID: ${id}\``;
      }

      if (error.message.includes("Unknown Message")) {
        return `❌ The message was deleted or I can't access it.\n\`Error ID: ${id}\``;
      }

      if (error.message.includes("rate limit")) {
        return `❌ I'm being rate limited. Please try again in a moment.\n\`Error ID: ${id}\``;
      }
    }

    // Generic error message
    return `❌ An unexpected error occurred. Please try again later.\n\`Error ID: ${id}\``;
  }
}
