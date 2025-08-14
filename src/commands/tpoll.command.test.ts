import { ChannelType } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockClient,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
} from "../test/mocks/discord.mock";
import tpollCommand from "./tpoll.command";

// Mock the poll service
vi.mock("../services", () => ({
  pollService: {
    createPoll: vi.fn(),
    addVote: vi.fn(),
  },
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  logError: vi.fn(),
}));

describe("Command: tpoll", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockChannel: ReturnType<typeof createMockTextChannel>;

  beforeEach(() => {
    mockChannel = createMockTextChannel();
    mockChannel.send = vi.fn().mockResolvedValue({
      id: "poll123",
      createdTimestamp: Date.now(),
      react: vi.fn().mockResolvedValue({}),
      edit: vi.fn().mockResolvedValue({}),
      url: "https://discord.com/channels/123/456/poll123",
      createReactionCollector: vi.fn(() => ({
        on: vi.fn(),
      })),
    } as any);

    mockMessage = createMockMessage({
      channel: mockChannel,
      author: createMockUser({ id: "user123" }),
    });

    mockClient = createMockClient();
    mockClient.user = createMockUser({ id: "bot456", bot: true }) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("has correct command metadata", () => {
    // ASSERT
    expect(tpollCommand.name).toBe("tpoll");
    expect(tpollCommand.description).toBe("Create a timed poll");
    expect(tpollCommand.category).toBe("utility");
    expect(tpollCommand.usage).toContain("!tpoll <seconds>");
    expect(tpollCommand.examples).toHaveLength(1);
    expect(tpollCommand.examples?.[0]).toContain("!tpoll 60");
  });

  describe("argument parsing", () => {
    it("parses seconds and quoted arguments correctly", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60 'What is your favorite color?' 'Red' 'Blue' 'Green'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.stringContaining("What is your favorite color?"),
      );
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇦 Red"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇧 Blue"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇨 Green"));
    });

    it("handles double quotes", async () => {
      // ARRANGE
      mockMessage.content = '!tpoll 30 "Choose wisely" "Option A" "Option B"';

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("Choose wisely"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇦 Option A"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇧 Option B"));
    });

    it("fails when no arguments provided", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!tpoll <seconds> 'Question?' 'Option 1' 'Option 2' ... 'Option N'`",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("fails when only seconds provided", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!tpoll <seconds> 'Question?' 'Option 1' 'Option 2' ... 'Option N'`",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("fails with insufficient quoted arguments", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60 'Question?' 'Only one option'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("You need at least a question and 2 options"),
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("validates seconds range - negative", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll -5 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Please provide a valid number of seconds (0-604800).",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates seconds range - too high", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 604801 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Please provide a valid number of seconds (0-604800).",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates seconds range - not a number", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll abc 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Please provide a valid number of seconds (0-604800).",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates question length - empty", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60 '' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates question length - too long (200+ chars)", async () => {
      // ARRANGE
      const longQuestion = "A".repeat(200); // 200 chars should be rejected
      mockMessage.content = `!tpoll 60 '${longQuestion}' 'A' 'B'`;

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates question length - way too long", async () => {
      // ARRANGE
      const longQuestion = "A".repeat(250); // Way over limit
      mockMessage.content = `!tpoll 60 '${longQuestion}' 'A' 'B'`;

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates option count - too few", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60 'Question?' 'Only one'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("You need at least a question and 2 options"),
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates option count - too many", async () => {
      // ARRANGE
      const manyOptions = Array.from({ length: 11 }, (_, i) => `'Option ${i + 1}'`).join(" ");
      mockMessage.content = `!tpoll 60 'Question?' ${manyOptions}`;

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "The number of options must be greater than 2 and less than 10",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("detects duplicate options", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 60 'Question?' 'Same' 'Same' 'Different'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("repeated options found: `Same`"),
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe("channel restrictions", () => {
    it("fails in channels without send capability", async () => {
      // ARRANGE
      const channelWithoutSend = {
        isDMBased: vi.fn(() => false),
        type: ChannelType.GuildVoice,
        // No send method
      };
      mockMessage = createMockMessage({ channel: channelWithoutSend });
      mockMessage.content = "!tpoll 60 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "This command can only be used in text channels.",
      );
    });
  });

  describe("poll creation", () => {
    it("creates a poll with correct message format", async () => {
      // ARRANGE
      const testAuthor = createMockUser({
        id: "user789",
        username: "TestCreator",
        toString: () => "<@user789>",
      });
      mockMessage = createMockMessage({
        channel: mockChannel,
        author: testAuthor,
        content: "!tpoll 60 'What is best?' 'Option A' 'Option B' 'Option C'",
      });

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      const expectedMessage = [
        "__*<@user789> started a poll*__:",
        "\n:bar_chart: **What is best?**\n\n🇦 Option A\n🇧 Option B\n🇨 Option C",
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      ].join("\n");

      expect(mockChannel.send).toHaveBeenCalledWith(expectedMessage);
    });

    it("creates reactions for all options", async () => {
      // ARRANGE
      const sentMessage = {
        id: "poll123",
        createdTimestamp: Date.now(),
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        url: "https://discord.com/channels/123/456/poll123",
        createReactionCollector: vi.fn(() => ({ on: vi.fn() })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 60 'Question?' 'A' 'B' 'C'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(sentMessage.react).toHaveBeenCalledTimes(3);
      expect(sentMessage.react).toHaveBeenCalledWith("🇦");
      expect(sentMessage.react).toHaveBeenCalledWith("🇧");
      expect(sentMessage.react).toHaveBeenCalledWith("🇨");
    });

    it("handles zero second polls (no timer)", async () => {
      // ARRANGE
      const sentMessage = {
        id: "poll123",
        react: vi.fn().mockResolvedValue({}),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 0 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.not.stringContaining("This poll ends"));
      expect(sentMessage.react).toHaveBeenCalledTimes(2);
    });

    it("adds timestamp for timed polls", async () => {
      // ARRANGE
      const now = Date.now();
      const sentMessage = {
        id: "poll123",
        createdTimestamp: now,
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        createReactionCollector: vi.fn(() => ({ on: vi.fn() })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 60 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(sentMessage.edit).toHaveBeenCalledWith(expect.stringContaining("This poll ends <t:"));
    });
  });

  describe("database integration", () => {
    it("creates poll in database for timed polls", async () => {
      // ARRANGE
      const { pollService } = await import("../services");
      const sentMessage = {
        id: "poll123",
        createdTimestamp: Date.now(),
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        createReactionCollector: vi.fn(() => ({ on: vi.fn() })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 300 'Database test?' 'Yes' 'No'";

      vi.mocked(pollService.createPoll).mockResolvedValue({
        id: 1,
        messageId: "poll123",
        channelId: mockChannel.id,
        creatorId: "user123",
        question: "Database test?",
        options: JSON.stringify([
          { text: "Yes", votes: [] },
          { text: "No", votes: [] },
        ]),
        endTime: expect.any(Date),
        createdAt: expect.any(Date),
      });

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(pollService.createPoll).toHaveBeenCalledWith(
        "poll123",
        mockChannel.id,
        "user123",
        "Database test?",
        ["Yes", "No"],
        expect.any(Date),
      );
    });

    it("does not create database entry for instant polls", async () => {
      // ARRANGE
      const { pollService } = await import("../services");
      const sentMessage = {
        id: "poll123",
        react: vi.fn().mockResolvedValue({}),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 0 'Instant poll?' 'Yes' 'No'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(pollService.createPoll).not.toHaveBeenCalled();
    });
  });

  describe("reaction collection", () => {
    it("sets up reaction collector with correct filter", async () => {
      // ARRANGE
      const sentMessage = {
        id: "poll123",
        createdTimestamp: Date.now(),
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        createReactionCollector: vi.fn(() => ({ on: vi.fn() })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 60 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(sentMessage.createReactionCollector).toHaveBeenCalledWith({
        filter: expect.any(Function),
        time: 60000,
      });
    });

    it("creates collector end handler", async () => {
      // ARRANGE
      const collectorOnSpy = vi.fn();
      const sentMessage = {
        id: "poll123",
        createdTimestamp: Date.now(),
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        url: "https://discord.com/channels/123/456/poll123",
        createReactionCollector: vi.fn(() => ({
          on: collectorOnSpy,
        })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!tpoll 60 'Question?' 'A' 'B'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(collectorOnSpy).toHaveBeenCalledWith("end", expect.any(Function));
    });
  });

  describe("edge cases", () => {
    it("handles maximum valid seconds (604800)", async () => {
      // ARRANGE
      mockMessage.content = "!tpoll 604800 'Week poll?' 'Yes' 'No'";

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("Week poll?"));
      expect(mockMessage.reply).not.toHaveBeenCalledWith(
        expect.stringContaining("valid number of seconds"),
      );
    });

    it("handles maximum options (10)", async () => {
      // ARRANGE
      const tenOptions = Array.from({ length: 10 }, (_, i) => `'Option ${i + 1}'`).join(" ");
      mockMessage.content = `!tpoll 60 'Many options?' ${tenOptions}`;

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("Many options?"));
      expect(mockMessage.reply).not.toHaveBeenCalledWith(
        expect.stringContaining("number of options must be"),
      );
    });

    it("handles question at maximum length (199 chars)", async () => {
      // ARRANGE
      const maxQuestion = "A".repeat(199);
      const sentMessage = {
        id: "poll123",
        createdTimestamp: Date.now(),
        react: vi.fn().mockResolvedValue({}),
        edit: vi.fn().mockResolvedValue({}),
        createReactionCollector: vi.fn(() => ({ on: vi.fn() })),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = `!tpoll 60 '${maxQuestion}' 'A' 'B'`;

      // ACT
      await tpollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining(maxQuestion));
      expect(mockMessage.reply).not.toHaveBeenCalledWith("Invalid question");
    });
  });
});
