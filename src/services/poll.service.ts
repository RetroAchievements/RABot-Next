import { db } from "../database/db";
import { polls, pollVotes } from "../database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { PollOption } from "../models";

type Poll = typeof polls.$inferSelect;
type PollVote = typeof pollVotes.$inferSelect;

export class PollService {
  static async createPoll(
    messageId: string,
    channelId: string,
    creatorId: string,
    question: string,
    options: string[],
    endTime: Date | null
  ): Promise<Poll> {
    const pollOptions: PollOption[] = options.map((text) => ({ text, votes: [] }));
    
    const result = await db.insert(polls).values({
      messageId,
      channelId,
      creatorId,
      question,
      options: JSON.stringify(pollOptions),
      endTime,
    }).returning();
    
    return result[0]!;
  }

  static async getPoll(messageId: string): Promise<Poll | null> {
    const [poll] = await db.select().from(polls).where(eq(polls.messageId, messageId));
    return poll || null;
  }

  static async addVote(pollId: number, userId: string, optionIndex: number): Promise<boolean> {
    // Check if user already voted.
    const existingVote = await this.getUserVote(pollId, userId);
    if (existingVote) {
      return false;
    }

    await db.insert(pollVotes).values({
      pollId,
      userId,
      optionIndex,
    });
    
    return true;
  }

  static async getUserVote(pollId: number, userId: string): Promise<PollVote | null> {
    const [vote] = await db.select()
      .from(pollVotes)
      .where(and(
        eq(pollVotes.pollId, pollId),
        eq(pollVotes.userId, userId)
      ));
    
    return vote || null;
  }

  static async getPollResults(pollId: number): Promise<Map<number, number>> {
    const votes = await db.select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
    
    const results = new Map<number, number>();
    votes.forEach((vote) => {
      const count = results.get(vote.optionIndex) || 0;
      results.set(vote.optionIndex, count + 1);
    });
    
    return results;
  }

  static async getActivePolls(): Promise<Poll[]> {
    const now = new Date();
    return await db.select()
      .from(polls)
      .where(isNull(polls.endTime)); // For now, just get polls without end times.
  }
}