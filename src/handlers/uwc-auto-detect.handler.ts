import type { ThreadChannel } from "discord.js";

import { UWC_FORUM_CHANNEL_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import { UwcHistoryService } from "../services/uwc-history.service";
import { logError, logger } from "../utils/logger";

// Pattern to match UWC thread titles: "12345: Achievement Title (Game Name)".
const UWC_THREAD_PATTERN = /^(\d+):\s*(.+?)\s*\((.+?)\)$/;

/**
 * Handles automatic detection of new UWC report threads.
 * When a thread is created matching the UWC pattern, searches for previous
 * polls and posts helpful information if found.
 */
export async function handleUwcAutoDetect(thread: ThreadChannel): Promise<void> {
  // Only process threads in the workshop guild.
  if (thread.guildId !== WORKSHOP_GUILD_ID) {
    return;
  }

  // Check if we have a specific forum channel configured.
  if (!UWC_FORUM_CHANNEL_ID) {
    // Auto-detection is disabled without a configured forum channel ID.
    return;
  }

  // Only process threads in the configured forum channel.
  if (thread.parentId !== UWC_FORUM_CHANNEL_ID) {
    return;
  }

  // Check if thread name matches the UWC pattern.
  const match = thread.name.match(UWC_THREAD_PATTERN);
  if (!match) {
    logger.debug("Thread name doesn't match UWC pattern", {
      threadId: thread.id,
      threadName: thread.name,
    });

    return;
  }

  const [, achievementIdStr = "", achievementTitle = "", gameName = ""] = match;
  const achievementId = parseInt(achievementIdStr, 10);

  if (isNaN(achievementId)) {
    logger.warn("Invalid achievement ID in UWC thread", {
      threadId: thread.id,
      achievementIdStr,
    });

    return;
  }

  logger.info("UWC auto-detect triggered", {
    threadId: thread.id,
    threadName: thread.name,
    achievementId,
    achievementTitle,
    gameName,
  });

  try {
    // Get previous polls from the database.
    const previousPolls = await UwcHistoryService.getPreviousPolls(achievementId);

    if (previousPolls.length === 0) {
      logger.debug("No previous UWC polls found", { achievementId });

      return;
    }

    // Format the polls into summaries.
    const summaries = UwcHistoryService.formatPollSummaries(previousPolls);

    // Generate the auto-response message.
    const response = UwcHistoryService.formatAutoResponse(summaries, achievementId);

    if (!response) {
      return;
    }

    // Send the message to the thread.
    await thread.send(response);

    logger.info("UWC auto-response sent", {
      threadId: thread.id,
      achievementId,
      pollsFound: previousPolls.length,
    });
  } catch (error) {
    logError(error, {
      event: "uwc_auto_detect_error",
      threadId: thread.id,
      achievementId,
    });
    // Don't throw - we don't want to crash the bot for this feature.
  }
}
