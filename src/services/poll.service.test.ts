import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanAllTables, createTestDb } from "../test/create-test-db";
import { PollService } from "./poll.service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

vi.mock("../database/db", () => ({
  get db() {
    return testDb;
  },
}));

describe("Service: PollService", () => {
  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables(testDb);
  });

  describe("createPoll", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.createPoll).toBeDefined();
    });

    it("creates a new poll with the provided details", async () => {
      // ACT
      const result = await PollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "What's your favorite color?",
        ["Red", "Blue", "Green"],
      );

      // ASSERT
      expect(result.messageId).toEqual("msg123");
      expect(result.channelId).toEqual("ch456");
      expect(result.creatorId).toEqual("user789");
      expect(result.question).toEqual("What's your favorite color?");
      expect(JSON.parse(result.options)).toEqual([
        { text: "Red", votes: [] },
        { text: "Blue", votes: [] },
        { text: "Green", votes: [] },
      ]);
      expect(result.endTime).toBeNull();
      expect(result.id).toBeDefined();
    });

    it("creates a poll with an end time when provided", async () => {
      // ARRANGE
      const endTime = new Date("2024-12-31T23:59:59Z");

      // ACT
      const result = await PollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "Question?",
        ["Option 1", "Option 2"],
        endTime,
      );

      // ASSERT
      expect(result.endTime).toEqual(endTime);
    });
  });

  describe("getPoll", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.getPoll).toBeDefined();
    });

    it("returns a poll when found", async () => {
      // ARRANGE
      await PollService.createPoll("msg123", "ch456", "user789", "Question?", ["A", "B"]);

      // ACT
      const result = await PollService.getPoll("msg123");

      // ASSERT
      expect(result).not.toBeNull();
      expect(result?.messageId).toEqual("msg123");
    });

    it("returns null when poll is not found", async () => {
      // ACT
      const result = await PollService.getPoll("nonexistent");

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe("addVote", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.addVote).toBeDefined();
    });

    it("adds a vote when user has not voted", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"]);

      // ACT
      const result = await PollService.addVote(poll.id, "user123", 0);

      // ASSERT
      expect(result).toEqual(true);

      const vote = await PollService.getUserVote(poll.id, "user123");
      expect(vote).not.toBeNull();
      expect(vote?.optionIndex).toEqual(0);
    });

    it("returns false when user has already voted", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"]);
      await PollService.addVote(poll.id, "user123", 0);

      // ACT
      const result = await PollService.addVote(poll.id, "user123", 1);

      // ASSERT
      expect(result).toEqual(false);
    });

    it("allows voting for different option indices", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B", "C"]);

      // ACT
      const result = await PollService.addVote(poll.id, "user123", 2);

      // ASSERT
      expect(result).toEqual(true);

      const vote = await PollService.getUserVote(poll.id, "user123");
      expect(vote?.optionIndex).toEqual(2);
    });
  });

  describe("getUserVote", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.getUserVote).toBeDefined();
    });

    it("returns a vote when user has voted", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"]);
      await PollService.addVote(poll.id, "user123", 1);

      // ACT
      const result = await PollService.getUserVote(poll.id, "user123");

      // ASSERT
      expect(result).not.toBeNull();
      expect(result?.pollId).toEqual(poll.id);
      expect(result?.userId).toEqual("user123");
      expect(result?.optionIndex).toEqual(1);
    });

    it("returns null when user has not voted", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"]);

      // ACT
      const result = await PollService.getUserVote(poll.id, "user456");

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe("getPollResults", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.getPollResults).toBeDefined();
    });

    it("returns vote counts by option index", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B", "C"]);
      await PollService.addVote(poll.id, "user1", 0);
      await PollService.addVote(poll.id, "user2", 0);
      await PollService.addVote(poll.id, "user3", 1);
      await PollService.addVote(poll.id, "user4", 0);
      await PollService.addVote(poll.id, "user5", 2);

      // ACT
      const results = await PollService.getPollResults(poll.id);

      // ASSERT
      expect(results).toBeInstanceOf(Map);
      expect(results.get(0)).toEqual(3);
      expect(results.get(1)).toEqual(1);
      expect(results.get(2)).toEqual(1);
    });

    it("returns empty map when there are no votes", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"]);

      // ACT
      const results = await PollService.getPollResults(poll.id);

      // ASSERT
      expect(results.size).toEqual(0);
    });

    it("handles votes for non-sequential option indices", async () => {
      // ARRANGE
      const poll = await PollService.createPoll("msg1", "ch1", "creator1", "Q?", [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
      ]);
      await PollService.addVote(poll.id, "user1", 0);
      await PollService.addVote(poll.id, "user2", 5);
      await PollService.addVote(poll.id, "user3", 5);

      // ACT
      const results = await PollService.getPollResults(poll.id);

      // ASSERT
      expect(results.get(0)).toEqual(1);
      expect(results.get(1)).toBeUndefined();
      expect(results.get(5)).toEqual(2);
    });
  });

  describe("getActivePolls", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.getActivePolls).toBeDefined();
    });

    it("returns polls with no end time", async () => {
      // ARRANGE
      await PollService.createPoll("msg1", "ch1", "creator1", "Q1?", ["A", "B"]);
      await PollService.createPoll("msg2", "ch1", "creator1", "Q2?", ["A", "B"]);
      await PollService.createPoll("msg3", "ch1", "creator1", "Q3?", ["A", "B"], new Date());

      // ACT
      const result = await PollService.getActivePolls();

      // ASSERT
      expect(result).toHaveLength(2);
    });

    it("returns empty array when there are no active polls", async () => {
      // ARRANGE
      await PollService.createPoll("msg1", "ch1", "creator1", "Q?", ["A", "B"], new Date());

      // ACT
      const result = await PollService.getActivePolls();

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});
