import { beforeEach, describe, expect, it, mock } from "bun:test";

import { createMockPoll, createMockPollVote } from "../test/mocks/database.mock";
import { PollService } from "./poll.service";

// ... mock the database module ...
let mockDb: any;

mock.module("../database/db", () => {
  mockDb = {
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    where: mock(() => Promise.resolve([])),
    insert: mock(() => mockDb),
    values: mock(() => mockDb),
    returning: mock(() => Promise.resolve([])),
  };

  return { db: mockDb };
});

describe("Service: PollService", () => {
  beforeEach(() => {
    // ... reset all mocks before each test ...
    mockDb.select.mockClear().mockReturnValue(mockDb);
    mockDb.from.mockClear().mockReturnValue(mockDb);
    mockDb.where.mockClear().mockResolvedValue([]);
    mockDb.insert.mockClear().mockReturnValue(mockDb);
    mockDb.values.mockClear().mockReturnValue(mockDb);
    mockDb.returning.mockClear().mockResolvedValue([]);
  });

  describe("createPoll", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.createPoll).toBeDefined();
    });

    it("creates a new poll with the provided details", async () => {
      // ARRANGE
      const mockPoll = createMockPoll({
        messageId: "msg123",
        channelId: "ch456",
        creatorId: "user789",
        question: "What's your favorite color?",
        options: JSON.stringify([
          { text: "Red", votes: [] },
          { text: "Blue", votes: [] },
          { text: "Green", votes: [] },
        ]),
        endTime: null,
      });
      mockDb.returning.mockResolvedValue([mockPoll]);

      // ACT
      const result = await PollService.createPoll(
        "msg123",
        "ch456",
        "user789",
        "What's your favorite color?",
        ["Red", "Blue", "Green"],
      );

      // ASSERT
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.values).toHaveBeenCalledWith({
        messageId: "msg123",
        channelId: "ch456",
        creatorId: "user789",
        question: "What's your favorite color?",
        options: JSON.stringify([
          { text: "Red", votes: [] },
          { text: "Blue", votes: [] },
          { text: "Green", votes: [] },
        ]),
        endTime: undefined,
      });
      expect(result).toEqual(mockPoll);
    });

    it("creates a poll with an end time when provided", async () => {
      // ARRANGE
      const endTime = new Date("2024-12-31T23:59:59Z");
      const mockPoll = createMockPoll({ endTime });
      mockDb.returning.mockResolvedValue([mockPoll]);

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
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          endTime,
        }),
      );
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
      const mockPoll = createMockPoll({ messageId: "msg123" });
      mockDb.where.mockResolvedValue([mockPoll]);

      // ACT
      const result = await PollService.getPoll("msg123");

      // ASSERT
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockPoll);
    });

    it("returns null when poll is not found", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

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
      // ... mock getUserVote to return null ...
      mockDb.where.mockResolvedValueOnce([]);

      // ACT
      const result = await PollService.addVote(1, "user123", 0);

      // ASSERT
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.values).toHaveBeenCalledWith({
        pollId: 1,
        userId: "user123",
        optionIndex: 0,
      });
      expect(result).toEqual(true);
    });

    it("returns false when user has already voted", async () => {
      // ARRANGE
      const existingVote = createMockPollVote();
      // ... mock getUserVote to return existing vote ...
      mockDb.where.mockResolvedValueOnce([existingVote]);

      // ACT
      const result = await PollService.addVote(1, "user123", 1);

      // ASSERT
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual(false);
    });

    it("allows voting for different option indices", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValueOnce([]); // ... no existing vote ...

      // ACT
      const result = await PollService.addVote(1, "user123", 2);

      // ASSERT
      expect(mockDb.values).toHaveBeenCalledWith({
        pollId: 1,
        userId: "user123",
        optionIndex: 2,
      });
      expect(result).toEqual(true);
    });
  });

  describe("getUserVote", () => {
    it("is defined", () => {
      // ASSERT
      expect(PollService.getUserVote).toBeDefined();
    });

    it("returns a vote when user has voted", async () => {
      // ARRANGE
      const mockVote = createMockPollVote({
        pollId: 1,
        userId: "user123",
        optionIndex: 1,
      });
      mockDb.where.mockResolvedValue([mockVote]);

      // ACT
      const result = await PollService.getUserVote(1, "user123");

      // ASSERT
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockVote);
    });

    it("returns null when user has not voted", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

      // ACT
      const result = await PollService.getUserVote(1, "user456");

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
      const mockVotes = [
        createMockPollVote({ optionIndex: 0 }),
        createMockPollVote({ optionIndex: 0 }),
        createMockPollVote({ optionIndex: 1 }),
        createMockPollVote({ optionIndex: 0 }),
        createMockPollVote({ optionIndex: 2 }),
      ];
      mockDb.where.mockResolvedValue(mockVotes);

      // ACT
      const results = await PollService.getPollResults(1);

      // ASSERT
      expect(results).toBeInstanceOf(Map);
      expect(results.get(0)).toEqual(3);
      expect(results.get(1)).toEqual(1);
      expect(results.get(2)).toEqual(1);
    });

    it("returns empty map when there are no votes", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

      // ACT
      const results = await PollService.getPollResults(1);

      // ASSERT
      expect(results.size).toEqual(0);
    });

    it("handles votes for non-sequential option indices", async () => {
      // ARRANGE
      const mockVotes = [
        createMockPollVote({ optionIndex: 0 }),
        createMockPollVote({ optionIndex: 5 }),
        createMockPollVote({ optionIndex: 5 }),
      ];
      mockDb.where.mockResolvedValue(mockVotes);

      // ACT
      const results = await PollService.getPollResults(1);

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
      const mockPolls = [
        createMockPoll({ id: 1, endTime: null }),
        createMockPoll({ id: 2, endTime: null }),
      ];
      mockDb.where.mockResolvedValue(mockPolls);

      // ACT
      const result = await PollService.getActivePolls();

      // ASSERT
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockPolls);
    });

    it("returns empty array when there are no active polls", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

      // ACT
      const result = await PollService.getActivePolls();

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});
