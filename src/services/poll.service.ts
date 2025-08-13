import { and, eq, isNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import { polls, pollVotes } from "../database/schema";
import type { PollOption } from "../models";

type Poll = typeof polls.$inferSelect;
type PollVote = typeof pollVotes.$inferSelect;
type DrizzleDb = BetterSQLite3Database<any>;

export class PollService {
  constructor(private db: DrizzleDb) {}

  async createPoll(
    messageId: string,
    channelId: string,
    creatorId: string,
    question: string,
    options: string[],
    endTime?: Date | null,
  ): Promise<Poll> {
    const pollOptions: PollOption[] = options.map((text) => ({ text, votes: [] }));

    const result = await this.db
      .insert(polls)
      .values({
        messageId,
        channelId,
        creatorId,
        question,
        options: JSON.stringify(pollOptions),
        endTime,
      })
      .returning();

    return result[0]!;
  }

  async getPoll(messageId: string): Promise<Poll | null> {
    const [poll] = await this.db.select().from(polls).where(eq(polls.messageId, messageId));

    return poll || null;
  }

  async addVote(pollId: number, userId: string, optionIndex: number): Promise<boolean> {
    // Check if user already voted.
    const existingVote = await this.getUserVote(pollId, userId);
    if (existingVote) {
      return false;
    }

    await this.db.insert(pollVotes).values({
      pollId,
      userId,
      optionIndex,
    });

    return true;
  }

  async getUserVote(pollId: number, userId: string): Promise<PollVote | null> {
    const [vote] = await this.db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));

    return vote || null;
  }

  async getPollResults(pollId: number): Promise<Map<number, number>> {
    const votes = await this.db.select().from(pollVotes).where(eq(pollVotes.pollId, pollId));

    const results = new Map<number, number>();
    for (const vote of votes) {
      const currentCount = results.get(vote.optionIndex) || 0;
      results.set(vote.optionIndex, currentCount + 1);
    }

    return results;
  }

  async getActivePolls(): Promise<Poll[]> {
    return await this.db.select().from(polls).where(isNull(polls.endTime));
  }
}