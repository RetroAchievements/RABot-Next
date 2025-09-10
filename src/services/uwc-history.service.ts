import { desc, eq } from "drizzle-orm";

import { db } from "../database/db";
import { uwcPollResults, uwcPolls } from "../database/schema";

type UwcPoll = typeof uwcPolls.$inferSelect;
type UwcPollResult = typeof uwcPollResults.$inferSelect;

export interface UwcPollWithResults {
  poll: UwcPoll;
  results: UwcPollResult[];
}

export interface UwcPollSummary {
  messageId: string;
  channelId: string;
  threadId: string | null;
  pollUrl: string;
  startedAt: Date;
  endedAt: Date | null;
  status: "active" | "approved" | "denied" | "no_action";
  topResults?: Array<{
    text: string;
    count: number;
    percentage: number;
  }>;
}

export class UwcHistoryService {
  /**
   * Get previous UWC polls for a specific achievement.
   * Returns up to 5 most recent polls.
   */
  static async getPreviousPolls(achievementId: number, limit = 5): Promise<UwcPollWithResults[]> {
    // Get polls for this achievement.
    const polls = await db
      .select()
      .from(uwcPolls)
      .where(eq(uwcPolls.achievementId, achievementId))
      .orderBy(desc(uwcPolls.startedAt))
      .limit(limit);

    // Get results for each poll.
    const pollsWithResults: UwcPollWithResults[] = [];
    for (const poll of polls) {
      const results = await db
        .select()
        .from(uwcPollResults)
        .where(eq(uwcPollResults.uwcPollId, poll.id))
        .orderBy(desc(uwcPollResults.voteCount));

      pollsWithResults.push({ poll, results });
    }

    return pollsWithResults;
  }

  /**
   * Determine the outcome of a UWC poll based on voting results.
   */
  static determinePollOutcome(results: UwcPollResult[]): "approved" | "denied" | "no_action" {
    if (results.length === 0) {
      return "no_action";
    }

    // Calculate total votes for Yes vs No options.
    let yesVotes = 0;
    let noVotes = 0;
    let needDiscussionVotes = 0;

    for (const result of results) {
      const optionLower = result.optionText.toLowerCase();

      // "Yes" options indicate the achievement should be demoted.
      if (optionLower.includes("yes")) {
        yesVotes += result.voteCount;
      }
      // "No" options indicate the achievement is acceptable.
      else if (optionLower.includes("no")) {
        noVotes += result.voteCount;
      }
      // "Need further discussion" is neutral.
      else if (optionLower.includes("discussion")) {
        needDiscussionVotes += result.voteCount;
      }
    }

    // If discussion votes are highest, it's no action.
    if (needDiscussionVotes > yesVotes && needDiscussionVotes > noVotes) {
      return "no_action";
    }

    // If yes votes (demote) are higher, it's denied.
    if (yesVotes > noVotes) {
      return "denied";
    }

    // If no votes (keep) are higher, it's approved.
    if (noVotes > yesVotes) {
      return "approved";
    }

    // If tied or no clear winner, no action.
    return "no_action";
  }

  /**
   * Format polls into summaries for display.
   */
  static formatPollSummaries(pollsWithResults: UwcPollWithResults[]): UwcPollSummary[] {
    const now = new Date();
    const THREE_DAYS_MS = 72 * 60 * 60 * 1000;

    return pollsWithResults.map(({ poll, results }) => {
      // Check if this is a stale active poll (marked active but over 72 hours old).
      const pollAge = now.getTime() - poll.startedAt.getTime();
      const isStaleActive = poll.status === "active" && pollAge > THREE_DAYS_MS;

      // For stale active polls, treat them as having no status.
      // For truly active polls, keep as "active".
      // For completed polls, determine the outcome.
      let status: "active" | "approved" | "denied" | "no_action";
      if (isStaleActive) {
        // Don't show a status for stale polls - we don't know the outcome.
        status = "no_action";
      } else if (poll.status === "active") {
        status = "active";
      } else {
        status = this.determinePollOutcome(results);
      }

      // Get top 2 results with votes.
      const topResults = results
        .filter((r) => r.voteCount > 0)
        .slice(0, 2)
        .map((r) => ({
          text: r.optionText,
          count: r.voteCount,
          percentage: r.votePercentage,
        }));

      return {
        messageId: poll.messageId,
        channelId: poll.channelId,
        threadId: poll.threadId,
        pollUrl: poll.pollUrl,
        startedAt: poll.startedAt,
        endedAt: poll.endedAt,
        status,
        topResults: topResults.length > 0 ? topResults : undefined,
      };
    });
  }

  /**
   * Format the auto-response message for previous UWC polls.
   */
  static formatAutoResponse(summaries: UwcPollSummary[], achievementId: number): string {
    if (summaries.length === 0) {
      return "";
    }

    let response = `📊 **Previous UWC Poll${summaries.length > 1 ? "s" : ""} Found**\n\n`;
    response += `Achievement **${achievementId}** has been reviewed before:\n\n`;

    for (const summary of summaries) {
      // Format date as YYYY-MM-DD.
      const dateStr = summary.startedAt.toISOString().split("T")[0];

      // Build the entry.
      if (summary.status === "active") {
        // For active polls, just show that it's active.
        response += `• ${dateStr}: [Poll](${summary.pollUrl}) → 🔵 **Active Poll**`;
      } else if (summary.topResults && summary.topResults.length > 0 && summary.topResults[0]) {
        // For completed polls, show the winning option.
        const winningOption = summary.topResults[0];
        const percentage =
          winningOption.percentage > 0 ? `, ${winningOption.percentage.toFixed(1)}%` : "";
        response += `• ${dateStr}: [Poll](${summary.pollUrl}) → "${winningOption.text}" (${winningOption.count} votes${percentage})`;
      } else {
        // For stale active polls or polls without results, just show the date and link.
        response += `• ${dateStr}: [Poll](${summary.pollUrl})`;
      }

      response += "\n";
    }

    response += "\n_This is an automated message to help track UWC history._";

    return response;
  }
}
