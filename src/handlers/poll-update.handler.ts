import { ChannelType, type Message, type PartialMessage, type ThreadChannel } from "discord.js";

import { UWC_VOTE_CONCLUDED_TAG_ID, UWC_VOTING_TAG_ID } from "../config/constants";
import { type PollResultData, UwcPollService } from "../services/uwc-poll.service";
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
    // Extract poll results.
    const results: PollResultData[] = [];
    let totalVotes = 0;

    // Calculate total votes from all answers.
    for (const answer of newMessage.poll.answers.values()) {
      totalVotes += answer.voteCount;
    }

    // Build results array.
    for (const answer of newMessage.poll.answers.values()) {
      const votePercentage = totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;

      if (answer.text) {
        results.push({
          optionText: answer.text,
          voteCount: answer.voteCount,
          votePercentage,
        });
      }
    }

    // Store the results in the database.
    await UwcPollService.completeUwcPoll(newMessage.id, results);

    logger.info("Stored UWC poll results", {
      messageId: newMessage.id,
      totalVotes,
      results: results.map((r) => ({ option: r.optionText, votes: r.voteCount })),
    });

    // Update thread tags if this was in a forum thread.
    if (
      uwcPoll.threadId &&
      newMessage.channel?.type === ChannelType.PublicThread &&
      UWC_VOTING_TAG_ID &&
      UWC_VOTE_CONCLUDED_TAG_ID
    ) {
      try {
        const thread = newMessage.channel as ThreadChannel;
        const currentTags = thread.appliedTags || [];

        // Remove voting tag and add concluded tag.
        const newTags = currentTags.filter((tag) => tag !== UWC_VOTING_TAG_ID);
        if (!newTags.includes(UWC_VOTE_CONCLUDED_TAG_ID)) {
          newTags.push(UWC_VOTE_CONCLUDED_TAG_ID);
        }

        await thread.setAppliedTags(newTags);

        logger.info("Updated thread tags after poll completion", {
          threadId: thread.id,
          removedTag: UWC_VOTING_TAG_ID,
          addedTag: UWC_VOTE_CONCLUDED_TAG_ID,
        });
      } catch (error) {
        logError(error, {
          event: "uwc_tag_update_error",
          threadId: uwcPoll.threadId,
          messageId: newMessage.id,
        });
      }
    }
  } catch (error) {
    logError(error, {
      event: "uwc_poll_completion_error",
      messageId: newMessage.id,
      channelId: newMessage.channelId,
    });
  }
}
