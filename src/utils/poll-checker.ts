import { ChannelType, type Client, type ThreadChannel } from "discord.js";

import { UWC_VOTE_CONCLUDED_TAG_ID, UWC_VOTING_TAG_ID } from "../config/constants";
import { type PollResultData, UwcPollService } from "../services/uwc-poll.service";
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

          // Extract poll results.
          const results: PollResultData[] = [];
          let totalVotes = 0;

          // Calculate total votes from all answers.
          for (const answer of message.poll.answers.values()) {
            totalVotes += answer.voteCount;
          }

          // Build results array.
          for (const answer of message.poll.answers.values()) {
            const votePercentage = totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;

            if (answer.text) {
              results.push({
                optionText: answer.text,
                voteCount: answer.voteCount,
                votePercentage,
              });
            }
          }

          // Complete the poll in the database.
          await UwcPollService.completeUwcPoll(poll.messageId, results);

          // Update thread tags if applicable.
          if (
            poll.threadId &&
            channel.type === ChannelType.PublicThread &&
            UWC_VOTING_TAG_ID &&
            UWC_VOTE_CONCLUDED_TAG_ID
          ) {
            try {
              const thread = channel as ThreadChannel;
              const currentTags = thread.appliedTags || [];

              // Remove voting tag and add concluded tag.
              const newTags = currentTags.filter((tag) => tag !== UWC_VOTING_TAG_ID);
              if (!newTags.includes(UWC_VOTE_CONCLUDED_TAG_ID)) {
                newTags.push(UWC_VOTE_CONCLUDED_TAG_ID);
              }

              await thread.setAppliedTags(newTags);

              logger.info("Updated thread tags for expired poll", {
                threadId: thread.id,
                messageId: poll.messageId,
              });
            } catch (error) {
              logError(error, {
                event: "uwc_poll_startup_tag_error",
                threadId: poll.threadId,
                messageId: poll.messageId,
              });
            }
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
