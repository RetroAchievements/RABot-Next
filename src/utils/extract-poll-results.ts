import { ChannelType, type Poll, type ThreadChannel } from "discord.js";

import { UWC_VOTE_CONCLUDED_TAG_ID, UWC_VOTING_TAG_ID } from "../config/constants";
import type { PollResultData } from "../services/uwc-poll.service";
import { logError, logger } from "./logger";

export function extractPollResults(poll: Poll): PollResultData[] {
  let totalVotes = 0;

  for (const answer of poll.answers.values()) {
    totalVotes += answer.voteCount;
  }

  const results: PollResultData[] = [];
  for (const answer of poll.answers.values()) {
    const votePercentage = totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;

    if (answer.text) {
      results.push({
        optionText: answer.text,
        voteCount: answer.voteCount,
        votePercentage,
      });
    }
  }

  return results;
}

interface UpdateUwcThreadTagsOptions {
  threadId: string;
  channel: { type: ChannelType };
  messageId: string;
  logContext: string;
}

export async function updateUwcThreadTags({
  threadId,
  channel,
  messageId,
  logContext,
}: UpdateUwcThreadTagsOptions): Promise<void> {
  if (
    !threadId ||
    channel.type !== ChannelType.PublicThread ||
    !UWC_VOTING_TAG_ID ||
    !UWC_VOTE_CONCLUDED_TAG_ID
  ) {
    return;
  }

  try {
    const thread = channel as unknown as ThreadChannel;
    const currentTags = thread.appliedTags || [];

    const newTags = currentTags.filter((tag) => tag !== UWC_VOTING_TAG_ID);
    if (!newTags.includes(UWC_VOTE_CONCLUDED_TAG_ID)) {
      newTags.push(UWC_VOTE_CONCLUDED_TAG_ID);
    }

    await thread.setAppliedTags(newTags);

    logger.info(`Updated thread tags ${logContext}`, {
      threadId: thread.id,
      messageId,
    });
  } catch (error) {
    logError(error, {
      event: `uwc_${logContext}_tag_error`,
      threadId,
      messageId,
    });
  }
}
