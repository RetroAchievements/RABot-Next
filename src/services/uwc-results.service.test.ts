import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Guild, GuildChannel, Message, ThreadChannel } from "discord.js";

import { APPROVED_TAG_ID, DENIED_TAG_ID } from "../constants/uwc.constants";
import { UwcResultsService } from "./uwc-results.service";

describe("UwcResultsService", () => {
  afterEach(() => {
    mock.restore();
  });
  const createMockMessage = (overrides?: any): Message =>
    ({
      id: "msg-123",
      author: { id: "bot-123" },
      poll: {
        question: { text: "Is this an Unwelcome Concept?" },
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        answers: new Map([
          [1, { text: "No, leave as is", fetchVoters: mock(() => Promise.resolve(new Map())) }],
          [2, { text: "Yes, demote", fetchVoters: mock(() => Promise.resolve(new Map())) }],
        ]),
      },
      url: "https://discord.com/channels/123/456/789",
      createdAt: new Date("2024-05-01"),
      ...overrides,
    }) as unknown as Message;

  const createMockChannel = (name: string, messages: Message[] = []) =>
    ({
      id: `channel-${name}`,
      name,
      messages: {
        fetch: mock(() => Promise.resolve(new Map(messages.map((m) => [m.id, m])))),
      },
    }) as unknown as GuildChannel;

  const createMockThread = (name: string, messages: Message[] = [], appliedTags: string[] = []) =>
    ({
      id: `thread-${name}`,
      name,
      appliedTags,
      messages: {
        fetch: mock(() => Promise.resolve(new Map(messages.map((m) => [m.id, m])))),
      },
    }) as unknown as ThreadChannel;

  const createMockGuild = (channels: GuildChannel[], threads: ThreadChannel[] = []) =>
    ({
      id: "guild-123",
      channels: {
        fetch: mock(() => Promise.resolve(new Map(channels.map((c) => [c.id, c])))),
        fetchActiveThreads: mock(() =>
          Promise.resolve({ threads: new Map(threads.map((t) => [t.id, t])) }),
        ),
      },
    }) as unknown as Guild;

  describe("searchPreviousPolls", () => {
    it("should find polls in channels matching achievement ID", async () => {
      // ARRANGE
      const message = createMockMessage();
      const channel = createMockChannel("12345-test-achievement", [message]);
      const guild = createMockGuild([channel]);
      const botUser = { id: "bot-123" } as any;

      // ACT
      const results = await UwcResultsService.searchPreviousPolls(guild, "12345", botUser);

      // ASSERT
      expect(results).toHaveLength(1);
      expect(results[0]?.message.id).toBe("msg-123");
      expect(results[0]?.status).toBe("active");
    });

    it("should ignore polls not created by the bot", async () => {
      // ARRANGE
      const message = createMockMessage({
        author: { id: "other-user" } as any,
      });
      const channel = createMockChannel("12345-test-achievement", [message]);
      const guild = createMockGuild([channel]);
      const botUser = { id: "bot-123" } as any;

      // ACT
      const results = await UwcResultsService.searchPreviousPolls(guild, "12345", botUser);

      // ASSERT
      expect(results).toHaveLength(0);
    });

    it("should ignore non-UWC polls", async () => {
      // ARRANGE
      const message = createMockMessage({
        poll: {
          question: { text: "Different poll?" },
          expiresAt: new Date(Date.now() + 86400000),
          answers: new Map(),
        } as any,
      });
      const channel = createMockChannel("12345-test-achievement", [message]);
      const guild = createMockGuild([channel]);
      const botUser = { id: "bot-123" } as any;

      // ACT
      const results = await UwcResultsService.searchPreviousPolls(guild, "12345", botUser);

      // ASSERT
      expect(results).toHaveLength(0);
    });

    it("should detect approved threads", async () => {
      // ARRANGE
      const message = createMockMessage({
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: new Date(Date.now() - 86400000), // Expired
          answers: new Map([
            [1, { text: "No, leave as is", fetchVoters: mock(() => Promise.resolve(new Map())) }],
            [2, { text: "Yes, demote", fetchVoters: mock(() => Promise.resolve(new Map())) }],
          ]),
        } as any,
      });
      const thread = createMockThread(
        "12345-test-achievement",
        [message],
        [APPROVED_TAG_ID], // Approved tag
      );
      const guild = createMockGuild([], [thread]);
      const botUser = { id: "bot-123" } as any;

      // ACT
      const results = await UwcResultsService.searchPreviousPolls(guild, "12345", botUser);

      // ASSERT
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe("approved");
    });

    it("should detect denied threads", async () => {
      // ARRANGE
      const message = createMockMessage({
        poll: {
          question: { text: "Is this an Unwelcome Concept?" },
          expiresAt: new Date(Date.now() - 86400000), // Expired
          answers: new Map([
            [1, { text: "No, leave as is", fetchVoters: mock(() => Promise.resolve(new Map())) }],
            [2, { text: "Yes, demote", fetchVoters: mock(() => Promise.resolve(new Map())) }],
          ]),
        } as any,
      });
      const thread = createMockThread(
        "12345-test-achievement",
        [message],
        [DENIED_TAG_ID], // Denied tag
      );
      const guild = createMockGuild([], [thread]);
      const botUser = { id: "bot-123" } as any;

      // ACT
      const results = await UwcResultsService.searchPreviousPolls(guild, "12345", botUser);

      // ASSERT
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe("denied");
    });
  });

  describe("formatAutoResponse", () => {
    it("should format single approved poll correctly", () => {
      // ARRANGE
      const polls = [
        {
          message: createMockMessage({ createdAt: new Date("2024-05-01") }),
          channel: createMockChannel("12345-test"),
          status: "approved" as const,
          voteCounts: [
            { text: "No, leave as is", count: 8 },
            { text: "Yes, demote", count: 2 },
          ],
        },
      ];

      // ACT
      const response = UwcResultsService.formatAutoResponse(polls, "12345");

      // ASSERT
      expect(response).toContain("Previous UWC Poll Found");
      expect(response).toContain("✅ **Approved**");
      expect(response).toContain('"No, leave as is" (8), "Yes, demote" (2)');
      expect(response).toContain("May 2024");
    });

    it("should format multiple polls with different statuses", () => {
      // ARRANGE
      const polls = [
        {
          message: createMockMessage({ createdAt: new Date("2024-05-01") }),
          channel: createMockChannel("12345-test"),
          status: "approved" as const,
          voteCounts: [],
        },
        {
          message: createMockMessage({ createdAt: new Date("2024-06-01") }),
          channel: createMockChannel("12345-test-2"),
          status: "denied" as const,
          voteCounts: [],
        },
        {
          message: createMockMessage({ createdAt: new Date("2024-07-01") }),
          channel: createMockChannel("12345-test-3"),
          status: "active" as const,
          voteCounts: [],
        },
      ];

      // ACT
      const response = UwcResultsService.formatAutoResponse(polls, "12345");

      // ASSERT
      expect(response).toContain("Previous UWC Polls Found");
      expect(response).toContain("✅ **Approved**");
      expect(response).toContain("❌ **Denied**");
      expect(response).toContain("🔵 **Active**");
    });

    it("should handle polls without vote counts", () => {
      // ARRANGE
      const polls = [
        {
          message: createMockMessage(),
          channel: createMockChannel("12345-test"),
          status: "ended" as const,
          voteCounts: undefined,
        },
      ];

      // ACT
      const response = UwcResultsService.formatAutoResponse(polls, "12345");

      // ASSERT
      expect(response).toContain("⏳ **Ended (No Action)**");
      expect(response).not.toContain("Result:");
    });

    it("should show only non-zero vote counts", () => {
      // ARRANGE
      const polls = [
        {
          message: createMockMessage(),
          channel: createMockChannel("12345-test"),
          status: "approved" as const,
          voteCounts: [
            { text: "No, leave as is", count: 5 },
            { text: "Yes, demote", count: 0 },
            { text: "Need further discussion", count: 3 },
          ],
        },
      ];

      // ACT
      const response = UwcResultsService.formatAutoResponse(polls, "12345");

      // ASSERT
      expect(response).toContain('"No, leave as is" (5), "Need further discussion" (3)');
      expect(response).not.toContain("Yes, demote");
    });
  });
});
