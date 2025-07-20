import type { Guild, GuildChannel, Message, ThreadChannel, User } from "discord.js";

import { APPROVED_TAG_ID, DENIED_TAG_ID, UWC_POLL_QUESTION } from "../constants/uwc.constants";

interface PollResult {
  message: Message;
  channel: GuildChannel | ThreadChannel;
  status: "active" | "approved" | "denied" | "ended";
  voteCounts?: Array<{ text: string; count: number }>;
}

export class UwcResultsService {
  /**
   * Searches for previous UWC polls containing the given achievement ID.
   */
  static async searchPreviousPolls(
    guild: Guild,
    achievementId: string,
    botUser: User,
  ): Promise<PollResult[]> {
    const matchingPolls: PollResult[] = [];

    // Fetch all channels in the guild
    const channels = await guild.channels.fetch();

    // Search through all channels
    for (const [, channel] of channels) {
      if (!channel || !("messages" in channel)) continue;

      try {
        const messages = await channel.messages.fetch({ limit: 100 });

        for (const [, message] of messages) {
          if (message.author.id !== botUser.id) continue;
          if (!message.poll) continue;
          if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

          // Check if the channel name contains the achievement ID
          if (!channel.name.includes(achievementId)) continue;

          const expiresAt = message.poll.expiresAt;
          const isExpired = expiresAt && expiresAt.getTime() < Date.now();

          matchingPolls.push({
            message,
            channel,
            status: isExpired ? "ended" : "active",
          });
        }
      } catch (_error) {
        continue;
      }
    }

    // Also check active threads
    const activeThreads = await guild.channels.fetchActiveThreads();
    for (const [, thread] of activeThreads.threads) {
      try {
        const messages = await thread.messages.fetch({ limit: 100 });

        for (const [, message] of messages) {
          if (message.author.id !== botUser.id) continue;
          if (!message.poll) continue;
          if (message.poll.question.text !== UWC_POLL_QUESTION) continue;

          // Check if the thread name contains the achievement ID
          if (!thread.name.includes(achievementId)) continue;

          const expiresAt = message.poll.expiresAt;
          const isExpired = expiresAt && expiresAt.getTime() < Date.now();

          let status: PollResult["status"] = isExpired ? "ended" : "active";

          // Check for action tags if ended
          if (isExpired && thread.appliedTags) {
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
      } catch (_error) {
        continue;
      }
    }

    // Fetch vote counts for all matching polls
    for (const pollEntry of matchingPolls) {
      try {
        const poll = pollEntry.message.poll!;
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

        pollEntry.voteCounts = voteCounts;
      } catch (_error) {
        pollEntry.voteCounts = [];
      }
    }

    return matchingPolls;
  }

  /**
   * Formats the auto-response message for previous UWC polls.
   */
  static formatAutoResponse(polls: PollResult[], achievementId: string): string {
    let response = `📊 **Previous UWC Poll${polls.length > 1 ? "s" : ""} Found**\n\n`;
    response += `Achievement **${achievementId}** has been reviewed before:\n\n`;

    // Group by status
    const activePolls = polls.filter((p) => p.status === "active");
    const approvedPolls = polls.filter((p) => p.status === "approved");
    const deniedPolls = polls.filter((p) => p.status === "denied");
    const endedPolls = polls.filter((p) => p.status === "ended");

    // Show approved polls first
    if (approvedPolls.length > 0) {
      for (const poll of approvedPolls) {
        response += this.formatPollEntry(poll, "✅ **Approved**");
      }
    }

    // Then denied polls
    if (deniedPolls.length > 0) {
      for (const poll of deniedPolls) {
        response += this.formatPollEntry(poll, "❌ **Denied**");
      }
    }

    // Then active polls
    if (activePolls.length > 0) {
      for (const poll of activePolls) {
        response += this.formatPollEntry(poll, "🔵 **Active**");
      }
    }

    // Finally ended polls without action
    if (endedPolls.length > 0) {
      for (const poll of endedPolls) {
        response += this.formatPollEntry(poll, "⏳ **Ended (No Action)**");
      }
    }

    response += "\n_This is an automated message to help track UWC history._";

    return response;
  }

  private static formatPollEntry(poll: PollResult, statusLabel: string): string {
    let entry = `• [Poll in #${poll.channel.name}](${poll.message.url}) - ${statusLabel}`;

    // Add vote results if available
    if (poll.voteCounts && poll.voteCounts.length > 0) {
      const topResults = poll.voteCounts
        .filter((v) => v.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
        .map((v) => `"${v.text}" (${v.count})`)
        .join(", ");

      if (topResults) {
        entry += `\n  Result: ${topResults}`;
      }
    }

    // Add timestamp
    const createdAt = poll.message.createdAt;
    const monthYear = createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    entry += ` - ${monthYear}`;

    entry += "\n\n";

    return entry;
  }
}
