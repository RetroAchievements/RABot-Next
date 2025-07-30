import type { Message } from "discord.js";
import { ChannelType, MessageFlags } from "discord.js";

import { AUTO_PUBLISH_CHANNEL_IDS } from "../config/constants";
import { logApiCall, logError, logger } from "../utils/logger";

/**
 * Service for automatically publishing messages in announcement channels.
 * This service handles the auto-publishing logic for configured Discord announcement channels.
 */
export class AutoPublishService {
  /**
   * Checks if a message should be auto-published based on channel configuration.
   *
   * @param message - The Discord message to check
   * @returns True if the message should be auto-published, false otherwise
   */
  static shouldAutoPublish(message: Message): boolean {
    // Only process messages in announcement channels.
    if (message.channel.type !== ChannelType.GuildAnnouncement) {
      return false;
    }

    // Skip bot messages.
    if (message.author.bot) {
      return false;
    }

    // Skip already crossposted messages.
    if (message.flags.has(MessageFlags.Crossposted)) {
      return false;
    }

    // Check if the channel is in our auto-publish list.
    return AUTO_PUBLISH_CHANNEL_IDS.includes(message.channelId);
  }

  /**
   * Attempts to publish a message in an announcement channel.
   *
   * @param message - The Discord message to publish
   * @returns True if successfully published, false otherwise
   */
  static async publishMessage(message: Message): Promise<boolean> {
    try {
      logApiCall("Discord", `crosspost`, undefined, undefined, {
        channelId: message.channelId,
        messageId: message.id,
      });

      await message.crosspost();

      logger.info(
        `Auto-published message from ${message.author.tag} in channel ${message.channelId}.`,
      );

      return true;
    } catch (error) {
      // Handle specific error cases.
      if (error instanceof Error) {
        // Rate limit error.
        if (error.message.includes("rate limit")) {
          logger.warn(
            `Rate limited when trying to auto-publish message ${message.id} in channel ${message.channelId}.`,
          );
        }
        // Permission error.
        else if (
          error.message.includes("Missing Permissions") ||
          error.message.includes("Missing Access")
        ) {
          logger.error(
            `Missing permissions to auto-publish in channel ${message.channelId}. Ensure the bot has "Manage Messages" permission.`,
          );
        }
        // Unknown error.
        else {
          logError(error, {
            event: "auto_publish_error",
            channelId: message.channelId,
            messageId: message.id,
            userId: message.author.id,
            guildId: message.guildId || undefined,
          });
        }
      }

      return false;
    }
  }

  /**
   * Handles the auto-publishing flow for a message.
   * This is the main entry point for the auto-publish feature.
   *
   * @param message - The Discord message to process
   */
  static async handleMessage(message: Message): Promise<void> {
    if (!this.shouldAutoPublish(message)) {
      return;
    }

    logger.debug(
      `Processing message for auto-publish in channel ${message.channelId} from ${message.author.tag}.`,
    );

    await this.publishMessage(message);
  }
}
