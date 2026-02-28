import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanAllTables, createTestDb } from "../test/create-test-db";
import { UwcPollService } from "./uwc-poll.service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

vi.mock("../database/db", () => ({
  get db() {
    return testDb;
  },
}));

describe("UwcPollService", () => {
  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables(testDb);
  });

  describe("createUwcPoll", () => {
    it("creates a new UWC poll", async () => {
      // ARRANGE
      const pollData = {
        messageId: "123456789",
        channelId: "987654321",
        threadId: "555555555",
        creatorId: "111111111",
        achievementId: 14402,
        achievementName: "Test Achievement",
        gameId: 1234,
        gameName: "Test Game",
        pollUrl: "https://discord.com/channels/123/456/789",
      };

      // ACT
      const poll = await UwcPollService.createUwcPoll(pollData);

      // ASSERT
      expect(poll).toBeDefined();
      expect(poll.messageId).toEqual(pollData.messageId);
      expect(poll.channelId).toEqual(pollData.channelId);
      expect(poll.threadId).toEqual(pollData.threadId);
      expect(poll.achievementId).toEqual(pollData.achievementId);
      expect(poll.status).toEqual("active");
      expect(poll.endedAt).toBeNull();
    });

    it("creates a poll without optional fields", async () => {
      // ARRANGE
      const pollData = {
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      };

      // ACT
      const poll = await UwcPollService.createUwcPoll(pollData);

      // ASSERT
      expect(poll).toBeDefined();
      expect(poll.threadId).toBeNull();
      expect(poll.achievementId).toBeNull();
      expect(poll.gameId).toBeNull();
    });
  });

  describe("getUwcPollByMessageId", () => {
    it("returns a poll by message ID", async () => {
      // ARRANGE
      await UwcPollService.createUwcPoll({
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      // ACT
      const poll = await UwcPollService.getUwcPollByMessageId("123456789");

      // ASSERT
      expect(poll).toBeDefined();
      expect(poll?.messageId).toEqual("123456789");
    });

    it("returns null for non-existent poll", async () => {
      // ACT
      const poll = await UwcPollService.getUwcPollByMessageId("nonexistent");

      // ASSERT
      expect(poll).toBeNull();
    });
  });

  describe("completeUwcPoll", () => {
    it("completes a poll and stores results", async () => {
      // ARRANGE
      await UwcPollService.createUwcPoll({
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });
      const results = [
        { optionText: "No, leave as is", voteCount: 5, votePercentage: 50.0 },
        { optionText: "Yes, demote", voteCount: 3, votePercentage: 30.0 },
        { optionText: "Need further discussion", voteCount: 2, votePercentage: 20.0 },
      ];

      // ACT
      const { poll, results: storedResults } = await UwcPollService.completeUwcPoll(
        "123456789",
        results,
      );

      // ASSERT
      expect(poll.status).toEqual("completed");
      expect(poll.endedAt).toBeDefined();
      expect(storedResults).toHaveLength(3);
      expect(storedResults[0]?.optionText).toEqual("No, leave as is");
      expect(storedResults[0]?.voteCount).toEqual(5);
    });

    it("throws error for non-existent poll", async () => {
      // ACT & ASSERT
      await expect(async () => {
        await UwcPollService.completeUwcPoll("nonexistent", []);
      }).rejects.toThrow();
    });
  });

  describe("getActiveUwcPolls", () => {
    it("returns only active polls", async () => {
      // ARRANGE
      await UwcPollService.createUwcPoll({
        messageId: "active1",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });
      await UwcPollService.createUwcPoll({
        messageId: "completed1",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });
      await UwcPollService.completeUwcPoll("completed1", []);

      // ACT
      const activePolls = await UwcPollService.getActiveUwcPolls();

      // ASSERT
      expect(activePolls).toHaveLength(1);
      expect(activePolls[0]?.messageId).toEqual("active1");
    });
  });

  describe("getUwcPollsByAchievement", () => {
    it("returns polls for a specific achievement", async () => {
      // ARRANGE
      await UwcPollService.createUwcPoll({
        messageId: "poll1",
        channelId: "987654321",
        creatorId: "111111111",
        achievementId: 14402,
        achievementName: "Test Achievement",
        pollUrl: "https://discord.com/channels/123/456/789",
      });
      await UwcPollService.createUwcPoll({
        messageId: "poll2",
        channelId: "987654321",
        creatorId: "111111111",
        achievementId: 14402,
        achievementName: "Test Achievement",
        pollUrl: "https://discord.com/channels/123/456/789",
      });
      await UwcPollService.createUwcPoll({
        messageId: "poll3",
        channelId: "987654321",
        creatorId: "111111111",
        achievementId: 99999,
        achievementName: "Other Achievement",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      // ACT
      const polls = await UwcPollService.getUwcPollsByAchievement(14402);

      // ASSERT
      expect(polls).toHaveLength(2);
      expect(polls.every((p) => p.achievementId === 14402)).toEqual(true);
    });
  });

  describe("searchUwcPolls", () => {
    beforeEach(async () => {
      // Create some test polls.
      await UwcPollService.createUwcPoll({
        messageId: "poll1",
        channelId: "987654321",
        creatorId: "111111111",
        achievementName: "Sonic Speed",
        gameName: "Sonic the Hedgehog",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      await UwcPollService.createUwcPoll({
        messageId: "poll2",
        channelId: "987654321",
        creatorId: "111111111",
        achievementName: "Mario Master",
        gameName: "Super Mario Bros.",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      // Complete the polls so they appear in search.
      await UwcPollService.completeUwcPoll("poll1", []);
      await UwcPollService.completeUwcPoll("poll2", []);
    });

    it("searches by achievement name", async () => {
      // ACT
      const polls = await UwcPollService.searchUwcPolls("sonic");

      // ASSERT
      expect(polls).toHaveLength(1);
      expect(polls[0]?.achievementName).toEqual("Sonic Speed");
    });

    it("searches by game name", async () => {
      // ACT
      const polls = await UwcPollService.searchUwcPolls("mario");

      // ASSERT
      expect(polls).toHaveLength(1);
      expect(polls[0]?.gameName).toEqual("Super Mario Bros.");
    });

    it("returns empty array for no matches", async () => {
      // ACT
      const polls = await UwcPollService.searchUwcPolls("zelda");

      // ASSERT
      expect(polls).toHaveLength(0);
    });
  });
});
