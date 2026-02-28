import type { Client } from "discord.js";

import { UwcPollService } from "../services/uwc-poll.service";
import { extractPollResults, updateUwcThreadTags } from "./extract-poll-results";
import { logError, logger } from "./logger";

/**
 * Check for any UWC polls that may have ended while the bot was offline.
 * This runs on bot startup to ensure we don't miss any poll completions.
 */
export async function checkExpiredUwcPolls(client: Client): Promise<void> {
  logger.info("Checking for expired UWC polls...");

  try {
    // Get all active polls.
    const activePolls = await UwcPollService.getActiveUwcPolls();

    if (activePolls.length === 0) {
      logger.info("No active UWC polls found");

      return;
    }

    logger.info(`Found ${activePolls.length} active UWC poll(s), checking status...`);

    for (const poll of activePolls) {
      try {
        // Fetch the channel.
        const channel = await client.channels.fetch(poll.channelId);
        if (!channel || !channel.isTextBased()) {
          continue;
        }

        // Fetch the message.
        const message = await channel.messages.fetch(poll.messageId);
        if (!message.poll) {
          continue;
        }

        // Check if the poll has ended.
        const pollEnded = message.poll.resultsFinalized;

        if (pollEnded) {
          logger.info("Found ended UWC poll", {
            messageId: poll.messageId,
            channelId: poll.channelId,
          });

          const results = extractPollResults(message.poll);

          // Complete the poll in the database.
          await UwcPollService.completeUwcPoll(poll.messageId, results);

          // Update thread tags if applicable.
          if (poll.threadId) {
            await updateUwcThreadTags({
              threadId: poll.threadId,
              channel,
              messageId: poll.messageId,
              logContext: "for expired poll",
            });
          }
        }
      } catch (error) {
        logError(error, {
          event: "uwc_poll_startup_check_individual_error",
          messageId: poll.messageId,
          channelId: poll.channelId,
        });
      }
    }

    logger.info("Finished checking expired UWC polls");
  } catch (error) {
    logError(error, { event: "uwc_poll_startup_check_main_error" });
  }
}
