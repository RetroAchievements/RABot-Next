import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createInMemoryTestDatabase } from "../test/helpers/db-test.helper";
import { PollService } from "./poll.service";

describe("Service: PollService", () => {
  let testDb: ReturnType<typeof createInMemoryTestDatabase>;
  let pollService: PollService;

  beforeEach(() => {
    // Create a fresh in-memory database for each test.
    testDb = createInMemoryTestDatabase();
    pollService = new PollService(testDb.db);
  });

  afterEach(() => {
    // Clean up the test database.
    testDb.cleanup();
  });

  describe("createPoll", () => {
    it("creates a new poll with the provided details", async () => {
      // ACT
      const poll = await pollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "What's your favorite color?",
        ["Red", "Blue", "Green"],
      );

      // ASSERT
      expect(poll).toBeDefined();
      expect(poll.messageId).toBe("msg123");
      expect(poll.channelId).toBe("ch456");
      expect(poll.creatorId).toBe("user789");
      expect(poll.question).toBe("What's your favorite color?");
      expect(poll.options).toContain("Red");
      expect(poll.options).toContain("Blue");
      expect(poll.options).toContain("Green");
      expect(poll.endTime).toBeNull();
    });

    it("creates a poll with an end time when provided", async () => {
      // ARRANGE
      const endTime = new Date("2024-12-31T23:59:59Z");

      // ACT
      const poll = await pollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "Question?",
        ["Option 1", "Option 2"],
        endTime,
      );

      // ASSERT
      expect(poll.endTime).toEqual(endTime);
    });
  });

  describe("getPoll", () => {
    it("returns a poll when found", async () => {
      // ARRANGE
      const createdPoll = await pollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "Test Question",
        ["Option A", "Option B"],
      );

      // ACT
      const retrievedPoll = await pollService.getPoll("msg123");

      // ASSERT
      expect(retrievedPoll).toBeDefined();
      expect(retrievedPoll?.id).toBe(createdPoll.id);
      expect(retrievedPoll?.messageId).toBe("msg123");
      expect(retrievedPoll?.question).toBe("Test Question");
    });

    it("returns null when poll is not found", async () => {
      // ACT
      const poll = await pollService.getPoll("nonexistent");

      // ASSERT
      expect(poll).toBeNull();
    });
  });

  describe("addVote", () => {
    it("adds a vote when user has not voted", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);

      // ACT
      const result = await pollService.addVote(poll.id, "user123", 0);

      // ASSERT
      expect(result).toBe(true);

      // Verify the vote was stored.
      const vote = await pollService.getUserVote(poll.id, "user123");
      expect(vote).toBeDefined();
      expect(vote?.optionIndex).toBe(0);
    });

    it("returns false when user has already voted", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);
      await pollService.addVote(poll.id, "user123", 0);

      // ACT
      const result = await pollService.addVote(poll.id, "user123", 1);

      // ASSERT
      expect(result).toBe(false);

      // Verify the original vote is unchanged.
      const vote = await pollService.getUserVote(poll.id, "user123");
      expect(vote?.optionIndex).toBe(0);
    });

    it("allows voting for different option indices", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);

      // ACT
      const result = await pollService.addVote(poll.id, "user123", 2);

      // ASSERT
      expect(result).toBe(true);
      const vote = await pollService.getUserVote(poll.id, "user123");
      expect(vote?.optionIndex).toBe(2);
    });
  });

  describe("getUserVote", () => {
    it("returns a vote when user has voted", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);
      await pollService.addVote(poll.id, "user123", 1);

      // ACT
      const vote = await pollService.getUserVote(poll.id, "user123");

      // ASSERT
      expect(vote).toBeDefined();
      expect(vote?.pollId).toBe(poll.id);
      expect(vote?.userId).toBe("user123");
      expect(vote?.optionIndex).toBe(1);
    });

    it("returns null when user has not voted", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);

      // ACT
      const vote = await pollService.getUserVote(poll.id, "user456");

      // ASSERT
      expect(vote).toBeNull();
    });
  });

  describe("getPollResults", () => {
    it("returns vote counts by option index", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);

      // Add some votes.
      await pollService.addVote(poll.id, "user1", 0);
      await pollService.addVote(poll.id, "user2", 0);
      await pollService.addVote(poll.id, "user3", 1);
      await pollService.addVote(poll.id, "user4", 0);
      await pollService.addVote(poll.id, "user5", 2);

      // ACT
      const results = await pollService.getPollResults(poll.id);

      // ASSERT
      expect(results).toBeInstanceOf(Map);
      expect(results.get(0)).toBe(3);
      expect(results.get(1)).toBe(1);
      expect(results.get(2)).toBe(1);
    });

    it("returns empty map when there are no votes", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
      ]);

      // ACT
      const results = await pollService.getPollResults(poll.id);

      // ASSERT
      expect(results.size).toBe(0);
    });

    it("handles votes for non-sequential option indices", async () => {
      // ARRANGE
      const poll = await pollService.createPoll("msg123", "ch456", "creator", "Question", [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
      ]);

      await pollService.addVote(poll.id, "user1", 0);
      await pollService.addVote(poll.id, "user2", 5);
      await pollService.addVote(poll.id, "user3", 5);

      // ACT
      const results = await pollService.getPollResults(poll.id);

      // ASSERT
      expect(results.get(0)).toBe(1);
      expect(results.get(1)).toBeUndefined();
      expect(results.get(5)).toBe(2);
    });
  });

  describe("getActivePolls", () => {
    it("returns polls with no end time", async () => {
      // ARRANGE
      await pollService.createPoll("msg1", "ch1", "user1", "Q1", ["A", "B"]);
      await pollService.createPoll("msg2", "ch2", "user2", "Q2", ["C", "D"]);
      await pollService.createPoll(
        "msg3",
        "ch3",
        "user3",
        "Q3",
        ["E", "F"],
        new Date("2025-12-31"),
      );

      // ACT
      const activePolls = await pollService.getActivePolls();

      // ASSERT
      expect(activePolls).toHaveLength(2);
      expect(activePolls[0]?.messageId).toBe("msg1");
      expect(activePolls[1]?.messageId).toBe("msg2");
    });

    it("returns empty array when there are no active polls", async () => {
      // ARRANGE - Create only polls with end times.
      await pollService.createPoll(
        "msg1",
        "ch1",
        "user1",
        "Q1",
        ["A", "B"],
        new Date("2025-12-31"),
      );

      // ACT
      const activePolls = await pollService.getActivePolls();

      // ASSERT
      expect(activePolls).toEqual([]);
    });
  });
});
