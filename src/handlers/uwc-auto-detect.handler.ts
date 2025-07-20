import type { ThreadChannel } from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import type { BotClient } from "../models";
import { UwcResultsService } from "../services/uwc-results.service";
import { logger } from "../utils/logger";

// Pattern to match UWC thread titles: "12345: Achievement Title (Game Name)"
const UWC_THREAD_PATTERN = /^(\d+):\s*(.+?)\s*\((.+?)\)$/;

/**
 * Handles automatic detection of new UWC report threads.
 * When a thread is created matching the UWC pattern, searches for previous
 * polls and posts helpful information if found.
 */
export async function handleUwcAutoDetect(thread: ThreadChannel, client: BotClient): Promise<void> {
  // Only process threads in the workshop guild
  if (thread.guildId !== WORKSHOP_GUILD_ID) {
    return;
  }

  // Check if we have a specific forum channel configured
  const uwcForumChannelId = process.env.UWC_FORUM_CHANNEL_ID;
  if (!uwcForumChannelId) {
    // Auto-detection is disabled without a configured forum channel ID
    return;
  }

  // Only process threads in the configured forum channel
  if (thread.parentId !== uwcForumChannelId) {
    return;
  }

  // Check if thread name matches the UWC pattern
  const match = thread.name.match(UWC_THREAD_PATTERN);
  if (!match) {
    return;
  }

  const [, achievementId = "", achievementTitle = "", gameName = ""] = match;

  logger.info("UWC auto-detect triggered", {
    threadId: thread.id,
    threadName: thread.name,
    achievementId,
    achievementTitle,
    gameName,
  });

  try {
    // Search for previous UWC polls
    const previousPolls = await UwcResultsService.searchPreviousPolls(
      thread.guild,
      achievementId,
      client.user!,
    );

    if (previousPolls.length === 0) {
      logger.debug("No previous UWC polls found", { achievementId });

      return;
    }

    // Format and send the auto-response
    const response = UwcResultsService.formatAutoResponse(previousPolls, achievementId);

    // Send the message to the thread
    await thread.send(response);

    logger.info("UWC auto-response sent", {
      threadId: thread.id,
      achievementId,
      pollsFound: previousPolls.length,
    });
  } catch (error) {
    logger.error("Error in UWC auto-detection", {
      error,
      threadId: thread.id,
      achievementId,
    });
    // Don't throw - we don't want to crash the bot for this feature
  }
}
