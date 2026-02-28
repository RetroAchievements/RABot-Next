import type { Message, PartialMessage } from "discord.js";

import { UwcPollService } from "../services/uwc-poll.service";
import { extractPollResults, updateUwcThreadTags } from "../utils/extract-poll-results";
import { logError, logger } from "../utils/logger";

/**
 * Handle poll updates, specifically to detect when polls end.
 */
export async function handlePollUpdate(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
): Promise<void> {
  // Only process if the message has a poll.
  if (!newMessage.poll) {
    return;
  }

  // Check if the poll has ended.
  const pollEnded = newMessage.poll.resultsFinalized;

  // If the poll hasn't ended, nothing to do.
  if (!pollEnded) {
    return;
  }

  // Check if this is a UWC poll.
  const uwcPoll = await UwcPollService.getUwcPollByMessageId(newMessage.id);
  if (!uwcPoll || uwcPoll.status !== "active") {
    return;
  }

  logger.info("UWC poll ended", {
    messageId: newMessage.id,
    channelId: newMessage.channelId,
  });

  try {
    const results = extractPollResults(newMessage.poll);

    // Store the results in the database.
    await UwcPollService.completeUwcPoll(newMessage.id, results);

    let totalVotes = 0;
    for (const r of results) {
      totalVotes += r.voteCount;
    }

    logger.info("Stored UWC poll results", {
      messageId: newMessage.id,
      totalVotes,
      results: results.map((r) => ({ option: r.optionText, votes: r.voteCount })),
    });

    // Update thread tags if this was in a forum thread.
    if (uwcPoll.threadId && newMessage.channel) {
      await updateUwcThreadTags({
        threadId: uwcPoll.threadId,
        channel: newMessage.channel,
        messageId: newMessage.id,
        logContext: "after poll completion",
      });
    }
  } catch (error) {
    logError(error, {
      event: "uwc_poll_completion_error",
      messageId: newMessage.id,
      channelId: newMessage.channelId,
    });
  }
}
