import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "../database/db";
import { uwcPollResults, uwcPolls } from "../database/schema";

type UwcPoll = typeof uwcPolls.$inferSelect;
type UwcPollResult = typeof uwcPollResults.$inferSelect;

export interface UwcPollData {
  messageId: string;
  channelId: string;
  threadId?: string | null;
  creatorId: string;
  achievementId?: number | null;
  achievementName?: string | null;
  gameId?: number | null;
  gameName?: string | null;
  pollUrl: string;
}

export interface PollResultData {
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export class UwcPollService {
  /**
   * Create a new UWC poll record.
   */
  static async createUwcPoll(data: UwcPollData): Promise<UwcPoll> {
    const result = await db
      .insert(uwcPolls)
      .values({
        messageId: data.messageId,
        channelId: data.channelId,
        threadId: data.threadId,
        creatorId: data.creatorId,
        achievementId: data.achievementId,
        achievementName: data.achievementName,
        gameId: data.gameId,
        gameName: data.gameName,
        pollUrl: data.pollUrl,
      })
      .returning();

    return result[0]!;
  }

  /**
   * Get a UWC poll by message ID.
   */
  static async getUwcPollByMessageId(messageId: string): Promise<UwcPoll | null> {
    const [poll] = await db.select().from(uwcPolls).where(eq(uwcPolls.messageId, messageId));

    return poll || null;
  }

  /**
   * Get all active UWC polls.
   */
  static async getActiveUwcPolls(): Promise<UwcPoll[]> {
    return db
      .select()
      .from(uwcPolls)
      .where(and(eq(uwcPolls.status, "active"), isNull(uwcPolls.endedAt)));
  }

  /**
   * Complete a UWC poll and store its results.
   */
  static async completeUwcPoll(
    messageId: string,
    results: PollResultData[],
  ): Promise<{ poll: UwcPoll; results: UwcPollResult[] }> {
    // Update the poll status.
    const [updatedPoll] = await db
      .update(uwcPolls)
      .set({
        status: "completed",
        endedAt: new Date(),
      })
      .where(eq(uwcPolls.messageId, messageId))
      .returning();

    if (!updatedPoll) {
      throw new Error(`UWC poll with message ID ${messageId} not found`);
    }

    // Insert the results if there are any.
    let insertedResults: UwcPollResult[] = [];

    if (results.length > 0) {
      insertedResults = await db
        .insert(uwcPollResults)
        .values(
          results.map((result) => ({
            uwcPollId: updatedPoll.id,
            optionText: result.optionText,
            voteCount: result.voteCount,
            votePercentage: result.votePercentage,
          })),
        )
        .returning();
    }

    return { poll: updatedPoll, results: insertedResults };
  }

  /**
   * Get all UWC polls for a specific achievement.
   */
  static async getUwcPollsByAchievement(achievementId: number): Promise<UwcPoll[]> {
    return db
      .select()
      .from(uwcPolls)
      .where(eq(uwcPolls.achievementId, achievementId))
      .orderBy(desc(uwcPolls.startedAt));
  }

  /**
   * Get all UWC polls for a specific game.
   */
  static async getUwcPollsByGame(gameId: number): Promise<UwcPoll[]> {
    return db
      .select()
      .from(uwcPolls)
      .where(eq(uwcPolls.gameId, gameId))
      .orderBy(desc(uwcPolls.startedAt));
  }

  /**
   * Get poll results for a specific UWC poll.
   */
  static async getUwcPollResults(uwcPollId: number): Promise<UwcPollResult[]> {
    return db
      .select()
      .from(uwcPollResults)
      .where(eq(uwcPollResults.uwcPollId, uwcPollId))
      .orderBy(desc(uwcPollResults.voteCount));
  }

  /**
   * Search UWC polls by achievement or game name.
   */
  static async searchUwcPolls(searchTerm: string): Promise<UwcPoll[]> {
    const normalizedTerm = `%${searchTerm.toLowerCase()}%`;

    return db
      .select()
      .from(uwcPolls)
      .where(
        and(
          eq(uwcPolls.status, "completed"),
          or(
            sql`LOWER(${uwcPolls.achievementName}) LIKE ${normalizedTerm}`,
            sql`LOWER(${uwcPolls.gameName}) LIKE ${normalizedTerm}`,
          ),
        ),
      )
      .orderBy(desc(uwcPolls.startedAt));
  }
}
