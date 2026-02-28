import type { Client, Message, MessageReaction, User } from "discord.js";
import { Collection } from "discord.js";

import { PollService } from "../services/poll.service";
import { logError } from "./logger";
import { EMOJI_ALPHABET } from "./poll-constants";

interface BuildPollMessageOptions {
  authorMention: string;
  question: string;
  options: string[];
}

interface TimedPollCollectorOptions {
  sentMsg: Message;
  pollMsgLines: string[];
  client: Client;
  reactions: string[];
  milliseconds: number;
  pollId: number;
  onEnd: (finalText: string) => Promise<void>;
}

export function getReactionsForOptions(options: string[]): string[] {
  return Object.values(EMOJI_ALPHABET).slice(0, options.length);
}

export function buildPollMessageLines({
  authorMention,
  question,
  options,
}: BuildPollMessageOptions): string[] {
  const reactions = getReactionsForOptions(options);
  let optionsText = "";

  for (let i = 0; i < options.length; i++) {
    optionsText += `\n${reactions[i]} ${options[i]}`;
  }

  return [
    `__*${authorMention} started a poll*__:`,
    `\n:bar_chart: **${question}**\n${optionsText}`,
  ];
}

export async function addPollReactions(message: Message, reactions: string[]): Promise<void> {
  for (let i = 0; i < reactions.length; i++) {
    const emoji = reactions[i];
    if (emoji) {
      await message.react(emoji);
    }
  }
}

export function formatClosedPollMessage(
  pollMsgLines: string[],
  pollResults: Collection<string, number>,
): string {
  const finalPollMsg = [
    `~~${pollMsgLines[0]}~~\n:no_entry: **THIS POLL IS ALREADY CLOSED** :no_entry:`,
    pollMsgLines[1],
    "\n`This poll is closed.`",
    "__**RESULTS:**__\n",
  ];

  if (pollResults.size === 0) {
    finalPollMsg.push("No one voted");
  } else {
    const sortedResults = [...pollResults.entries()].sort((a, b) => b[1] - a[1]);
    for (const [emoji, count] of sortedResults) {
      finalPollMsg.push(`${emoji}: ${count}`);
    }
  }

  return finalPollMsg.join("\n");
}

export function startTimedPollCollector({
  sentMsg,
  pollMsgLines,
  client,
  reactions,
  milliseconds,
  pollId,
  onEnd,
}: TimedPollCollectorOptions): void {
  const voters = new Set<string>();
  const pollResults = new Collection<string, number>();

  const filter = (reaction: MessageReaction, user: User) => {
    if (client.user?.id === user.id) {
      return false;
    }

    if (voters.has(user.id)) {
      return false;
    }

    if (!reaction.emoji.name || !reactions.includes(reaction.emoji.name)) {
      return false;
    }

    voters.add(user.id);

    const emojiName = reaction.emoji.name!;
    const optionIndex = reactions.indexOf(emojiName);
    if (optionIndex !== -1) {
      PollService.addVote(pollId, user.id, optionIndex);

      const currentVotes = pollResults.get(emojiName) || 0;
      pollResults.set(emojiName, currentVotes + 1);
    }

    return true;
  };

  const collector = sentMsg.createReactionCollector({ filter, time: milliseconds });

  collector.on("end", async () => {
    try {
      const finalText = formatClosedPollMessage(pollMsgLines, pollResults);
      await onEnd(finalText);
    } catch (error) {
      logError("Error ending timed poll:", { error });
    }
  });
}
