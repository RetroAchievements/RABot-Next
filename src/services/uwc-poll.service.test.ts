import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "../database/db";
import { uwcPollResults, uwcPolls } from "../database/schema";
import { UwcPollService } from "./uwc-poll.service";

// Skip database-dependent tests in CI environment where Drizzle methods are undefined.
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const describeOrSkip = isCI ? describe.skip : describe;

describeOrSkip("UwcPollService", () => {
  // Clean up database after each test.
  afterEach(async () => {
    await db.delete(uwcPollResults);
    await db.delete(uwcPolls);
  });

  describe("createUwcPoll", () => {
    it("creates a new UWC poll", async () => {
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

      const poll = await UwcPollService.createUwcPoll(pollData);

      expect(poll).toBeDefined();
      expect(poll.messageId).toBe(pollData.messageId);
      expect(poll.channelId).toBe(pollData.channelId);
      expect(poll.threadId).toBe(pollData.threadId);
      expect(poll.achievementId).toBe(pollData.achievementId);
      expect(poll.status).toBe("active");
      expect(poll.endedAt).toBeNull();
    });

    it("creates a poll without optional fields", async () => {
      const pollData = {
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      };

      const poll = await UwcPollService.createUwcPoll(pollData);

      expect(poll).toBeDefined();
      expect(poll.threadId).toBeNull();
      expect(poll.achievementId).toBeNull();
      expect(poll.gameId).toBeNull();
    });
  });

  describe("getUwcPollByMessageId", () => {
    it("returns a poll by message ID", async () => {
      const pollData = {
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      };

      await UwcPollService.createUwcPoll(pollData);
      const poll = await UwcPollService.getUwcPollByMessageId("123456789");

      expect(poll).toBeDefined();
      expect(poll?.messageId).toBe("123456789");
    });

    it("returns null for non-existent poll", async () => {
      const poll = await UwcPollService.getUwcPollByMessageId("nonexistent");
      expect(poll).toBeNull();
    });
  });

  describe("completeUwcPoll", () => {
    it("completes a poll and stores results", async () => {
      // Create a poll first.
      const pollData = {
        messageId: "123456789",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      };

      await UwcPollService.createUwcPoll(pollData);

      // Complete the poll with results.
      const results = [
        {
          optionText: "No, leave as is",
          voteCount: 5,
          votePercentage: 50.0,
        },
        {
          optionText: "Yes, demote",
          voteCount: 3,
          votePercentage: 30.0,
        },
        {
          optionText: "Need further discussion",
          voteCount: 2,
          votePercentage: 20.0,
        },
      ];

      const { poll, results: storedResults } = await UwcPollService.completeUwcPoll(
        "123456789",
        results,
      );

      expect(poll.status).toBe("completed");
      expect(poll.endedAt).toBeDefined();
      expect(storedResults).toHaveLength(3);
      expect(storedResults[0]?.optionText).toBe("No, leave as is");
      expect(storedResults[0]?.voteCount).toBe(5);
    });

    it("throws error for non-existent poll", async () => {
      await expect(async () => {
        await UwcPollService.completeUwcPoll("nonexistent", []);
      }).rejects.toThrow();
    });
  });

  describe("getActiveUwcPolls", () => {
    it("returns only active polls", async () => {
      // Create an active poll.
      await UwcPollService.createUwcPoll({
        messageId: "active1",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      // Create and complete another poll.
      await UwcPollService.createUwcPoll({
        messageId: "completed1",
        channelId: "987654321",
        creatorId: "111111111",
        pollUrl: "https://discord.com/channels/123/456/789",
      });

      await UwcPollService.completeUwcPoll("completed1", []);

      const activePolls = await UwcPollService.getActiveUwcPolls();

      expect(activePolls).toHaveLength(1);
      expect(activePolls[0]?.messageId).toBe("active1");
    });
  });

  describe("getUwcPollsByAchievement", () => {
    it("returns polls for a specific achievement", async () => {
      // Create polls for different achievements.
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

      const polls = await UwcPollService.getUwcPollsByAchievement(14402);

      expect(polls).toHaveLength(2);
      expect(polls.every((p) => p.achievementId === 14402)).toBe(true);
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
      const polls = await UwcPollService.searchUwcPolls("sonic");
      expect(polls).toHaveLength(1);
      expect(polls[0]?.achievementName).toBe("Sonic Speed");
    });

    it("searches by game name", async () => {
      const polls = await UwcPollService.searchUwcPolls("mario");
      expect(polls).toHaveLength(1);
      expect(polls[0]?.gameName).toBe("Super Mario Bros.");
    });

    it("returns empty array for no matches", async () => {
      const polls = await UwcPollService.searchUwcPolls("zelda");
      expect(polls).toHaveLength(0);
    });
  });
});
