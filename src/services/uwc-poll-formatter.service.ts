import type { UwcPoll } from "./uwc-poll-fetcher.service";

export class UwcPollFormatterService {
  /**
   * Formats the response for the list command.
   */
  static formatListResponse(
    unvotedPolls: UwcPoll[],
    votedPolls: UwcPoll[],
    endedPollsAwaitingAction: UwcPoll[],
  ): string {
    let response = `**UWC Polls:**\n\n`;

    if (unvotedPolls.length > 0) {
      response += `**📋 Need Your Vote (${unvotedPolls.length}):**\n`;
      response += this.formatActivePolls(unvotedPolls);
    }

    if (votedPolls.length > 0) {
      if (unvotedPolls.length > 0) response += "\n";
      response += `**✅ Already Voted (${votedPolls.length}):**\n`;
      response += this.formatActivePolls(votedPolls);
    }

    if (endedPollsAwaitingAction.length > 0) {
      if (unvotedPolls.length > 0 || votedPolls.length > 0) response += "\n";
      response += `**⏳ Awaiting Action (${endedPollsAwaitingAction.length}):**\n`;
      response += this.formatEndedPolls(endedPollsAwaitingAction);
    }

    return response;
  }

  /**
   * Formats the response for the search command.
   */
  static formatSearchResponse(polls: UwcPoll[], query: string): string {
    let response = `**UWC Search Results for "${query}":**\n\n`;

    // Group by status
    const activePolls = polls.filter((p) => p.status === "active");
    const approvedPolls = polls.filter((p) => p.status === "approved");
    const deniedPolls = polls.filter((p) => p.status === "denied");
    const endedPolls = polls.filter((p) => p.status === "ended");

    if (activePolls.length > 0) {
      response += `**🔵 Active (${activePolls.length}):**\n`;
      response += this.formatSearchResults(activePolls);
    }

    if (approvedPolls.length > 0) {
      if (activePolls.length > 0) response += "\n";
      response += `**✅ Approved (${approvedPolls.length}):**\n`;
      response += this.formatSearchResults(approvedPolls);
    }

    if (deniedPolls.length > 0) {
      if (activePolls.length > 0 || approvedPolls.length > 0) response += "\n";
      response += `**❌ Denied (${deniedPolls.length}):**\n`;
      response += this.formatSearchResults(deniedPolls);
    }

    if (endedPolls.length > 0) {
      if (activePolls.length > 0 || approvedPolls.length > 0 || deniedPolls.length > 0) {
        response += "\n";
      }
      response += `**⏳ Ended without action (${endedPolls.length}):**\n`;
      response += this.formatSearchResults(endedPolls);
    }

    return response;
  }

  /**
   * Calculates the leading option from vote counts.
   */
  static getLeadingOption(voteCounts?: Array<{ text: string; count: number }>): {
    text: string;
    count: number;
  } | null {
    if (!voteCounts || voteCounts.length === 0) return null;

    let leading = voteCounts[0];
    if (!leading) return null;

    for (const current of voteCounts) {
      if (current.count > leading.count) {
        leading = current;
      }
    }

    return leading.count > 0 ? leading : null;
  }

  private static formatActivePolls(polls: UwcPoll[]): string {
    let response = "";

    for (const pollEntry of polls) {
      const { message, channel } = pollEntry;
      const poll = message.poll!;
      const expiresAt = poll.expiresAt;
      const timeRemaining = expiresAt
        ? Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60 / 60)
        : 0;

      response += `• [Poll in #${channel.name}](${message.url})`;
      if (timeRemaining > 0) {
        response += ` - ${timeRemaining} hours remaining`;
      }

      // Add leading vote info if available
      const leadingOption = pollEntry.leadingOption;
      if (leadingOption && leadingOption.count > 0) {
        response += ` [Leading: "${leadingOption.text}" (${leadingOption.count} votes)]`;
      }

      response += "\n";
    }

    return response;
  }

  private static formatEndedPolls(polls: UwcPoll[]): string {
    let response = "";

    for (const pollEntry of polls) {
      const { message, channel } = pollEntry;
      const poll = message.poll!;
      const expiresAt = poll.expiresAt;
      const daysSinceEnded = expiresAt
        ? Math.floor((Date.now() - expiresAt.getTime()) / 1000 / 60 / 60 / 24)
        : 0;

      response += `• [Poll in #${channel.name}](${message.url})`;
      if (daysSinceEnded > 0) {
        response += ` - ended ${daysSinceEnded} day${daysSinceEnded !== 1 ? "s" : ""} ago`;
      }

      // Add vote results for ended polls
      const voteCounts = pollEntry.voteCounts;
      if (voteCounts && voteCounts.length > 0) {
        const topResults = voteCounts
          .filter((v) => v.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 2)
          .map((v) => `"${v.text}" (${v.count})`)
          .join(", ");

        if (topResults) {
          response += ` [Result: ${topResults}]`;
        }
      }

      response += "\n";
    }

    return response;
  }

  private static formatSearchResults(polls: UwcPoll[]): string {
    let response = "";

    for (const { message, channel, voteCounts } of polls) {
      response += `• [${channel.name}](${message.url})`;

      if (voteCounts && voteCounts.length > 0) {
        const topResults = voteCounts
          .filter((v) => v.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 2)
          .map((v) => `"${v.text}" (${v.count})`)
          .join(", ");
        if (topResults) {
          response += ` - ${topResults}`;
        }
      }
      response += "\n";
    }

    return response;
  }
}
