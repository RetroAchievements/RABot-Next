import type { Guild, GuildChannel, Message, ThreadChannel, User } from "discord.js";

import { APPROVED_TAG_ID, DENIED_TAG_ID, UWC_POLL_QUESTION } from "../constants/uwc.constants";

export interface UwcPoll {
  message: Message;
  channel: GuildChannel | ThreadChannel;
  status: "active" | "approved" | "denied" | "ended";
  hasVoted?: boolean;
  voteCounts?: Array<{ text: string; count: number }>;
  leadingOption?: { text: string; count: number } | null;
}

export class UwcPollFetcherService {
  /**
   * Fetches all UWC polls from a guild.
   */
  static async fetchAllPolls(
    guild: Guild,
    botUser: User,
  ): Promise<{
    activePolls: UwcPoll[];
    endedPollsAwaitingAction: UwcPoll[];
  }> {
    const activePolls: UwcPoll[] = [];
    const endedPollsAwaitingAction: UwcPoll[] = [];

    // Fetch all channels in the guild
    const channels = await guild.channels.fetch();

    // Search through all channels
    for (const [, channel] of channels) {
      if (!channel || !("messages" in channel)) continue;

      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        await this.processMessages(messages, channel, botUser, activePolls);
      } catch (_error) {
        // Skip channels we can't access
        continue;
      }
    }

    // Also check active threads
    const activeThreads = await guild.channels.fetchActiveThreads();
    for (const [, thread] of activeThreads.threads) {
      try {
        const messages = await thread.messages.fetch({ limit: 100 });
        await this.processThreadMessages(
          messages,
          thread,
          botUser,
          activePolls,
          endedPollsAwaitingAction,
        );
      } catch (_error) {
        continue;
      }
    }

    return { activePolls, endedPollsAwaitingAction };
  }

  /**
   * Searches for UWC polls matching a query.
   */
  static async searchPolls(guild: Guild, botUser: User, query: string): Promise<UwcPoll[]> {
    const matchingPolls: UwcPoll[] = [];

    // Fetch all channels in the guild
    const channels = await guild.channels.fetch();

    // Search through all channels
    for (const [, channel] of channels) {
      if (!channel || !("messages" in channel)) continue;
      if (!channel.name.includes(query)) continue;

      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        await this.processMessagesForSearch(messages, channel, botUser, matchingPolls);
      } catch (_error) {
        continue;
      }
    }

    // Also check active threads
    const activeThreads = await guild.channels.fetchActiveThreads();
    for (const [, thread] of activeThreads.threads) {
      if (!thread.name.includes(query)) continue;

      try {
        const messages = await thread.messages.fetch({ limit: 100 });
        await this.processThreadMessagesForSearch(messages, thread, botUser, matchingPolls);
      } catch (_error) {
        continue;
      }
    }

    return matchingPolls;
  }

  /**
   * Fetches vote counts for a poll.
   */
  static async fetchVoteCounts(
    poll: Message["poll"],
  ): Promise<Array<{ text: string; count: number }>> {
    if (!poll) return [];

    const voteCounts: Array<{ text: string; count: number }> = [];

    for (const [, answer] of poll.answers) {
      try {
        const voters = await answer.fetchVoters({ limit: 100 });
        voteCounts.push({
          text: answer.text || "",
          count: voters.size,
        });
      } catch (_error) {
        voteCounts.push({
          text: answer.text || "",
          count: 0,
        });
      }
    }

    return voteCounts;
  }

  /**
   * Checks if a user has voted in a poll.
   */
  static async hasUserVoted(poll: Message["poll"], userId: string): Promise<boolean> {
    if (!poll) return false;

    for (const [, answer] of poll.answers) {
      try {
        const voters = await answer.fetchVoters({ limit: 100 });
        if (voters.has(userId)) {
          return true;
        }
      } catch (_error) {
        continue;
      }
    }

    return false;
  }

  private static async processMessages(
    messages: Map<string, Message>,
    channel: GuildChannel,
    botUser: User,
    activePolls: UwcPoll[],
  ): Promise<void> {
    for (const [, message] of messages) {
      if (message.author.id !== botUser.id) continue;
      if (!message.poll) continue;
      if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

      const expiresAt = message.poll.expiresAt;
      const isExpired = expiresAt && expiresAt.getTime() < Date.now();

      if (!isExpired) {
        activePolls.push({
          message,
          channel,
          status: "active",
        });
      }
    }
  }

  private static async processThreadMessages(
    messages: Map<string, Message>,
    thread: ThreadChannel,
    botUser: User,
    activePolls: UwcPoll[],
    endedPollsAwaitingAction: UwcPoll[],
  ): Promise<void> {
    for (const [, message] of messages) {
      if (message.author.id !== botUser.id) continue;
      if (!message.poll) continue;
      if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

      const expiresAt = message.poll.expiresAt;
      const isExpired = expiresAt && expiresAt.getTime() < Date.now();

      if (isExpired) {
        const hasActionTag =
          thread.appliedTags.includes(APPROVED_TAG_ID) ||
          thread.appliedTags.includes(DENIED_TAG_ID);
        if (!hasActionTag) {
          endedPollsAwaitingAction.push({
            message,
            channel: thread,
            status: "ended",
          });
        }
      } else {
        activePolls.push({
          message,
          channel: thread,
          status: "active",
        });
      }
    }
  }

  private static async processMessagesForSearch(
    messages: Map<string, Message>,
    channel: GuildChannel,
    botUser: User,
    matchingPolls: UwcPoll[],
  ): Promise<void> {
    for (const [, message] of messages) {
      if (message.author.id !== botUser.id) continue;
      if (!message.poll) continue;
      if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

      const expiresAt = message.poll.expiresAt;
      const isExpired = expiresAt && expiresAt.getTime() < Date.now();

      matchingPolls.push({
        message,
        channel,
        status: isExpired ? "ended" : "active",
      });
    }
  }

  private static async processThreadMessagesForSearch(
    messages: Map<string, Message>,
    thread: ThreadChannel,
    botUser: User,
    matchingPolls: UwcPoll[],
  ): Promise<void> {
    for (const [, message] of messages) {
      if (message.author.id !== botUser.id) continue;
      if (!message.poll) continue;
      if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

      const expiresAt = message.poll.expiresAt;
      const isExpired = expiresAt && expiresAt.getTime() < Date.now();

      let status: UwcPoll["status"] = isExpired ? "ended" : "active";

      if (isExpired) {
        if (thread.appliedTags.includes(APPROVED_TAG_ID)) {
          status = "approved";
        } else if (thread.appliedTags.includes(DENIED_TAG_ID)) {
          status = "denied";
        }
      }

      matchingPolls.push({
        message,
        channel: thread,
        status,
      });
    }
  }
}
