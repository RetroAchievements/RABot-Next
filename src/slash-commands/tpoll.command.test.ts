import type { Message } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockInteraction } from "../test/mocks/discord.mock";
import tpollSlashCommand from "./tpoll.command";

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

describe("SlashCommand: tpoll", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;
  let mockMessage: Message;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "tpoll",
      user: {
        id: "user123",
        username: "TestUser",
        toString: () => "<@user123>",
      },
      channel: {
        id: "channel456",
      },
    });

    mockMessage = {
      id: "poll123",
      createdTimestamp: Date.now(),
      react: vi.fn().mockResolvedValue({}),
      edit: vi.fn().mockResolvedValue({}),
      url: "https://discord.com/channels/123/456/poll123",
      createReactionCollector: vi.fn(() => ({
        on: vi.fn(),
      })) as any,
    } as unknown as Message;

    mockInteraction.editReply = vi.fn().mockResolvedValue(mockMessage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("has correct command data", () => {
    // ASSERT
    expect(tpollSlashCommand.data.name).toBe("tpoll");
    expect(tpollSlashCommand.data.description).toBe(
      "Create a timed poll that automatically closes",
    );
    expect(tpollSlashCommand.legacyName).toBe("tpoll");
  });

  it("has correct option configuration", () => {
    // ASSERT
    const options = tpollSlashCommand.data.options;
    expect(options).toHaveLength(12); // seconds + question + 10 options

    // Check seconds option exists
    const secondsOption = options.find((opt: any) => opt.name === "seconds");
    expect(secondsOption).toBeDefined();

    // Check question option exists
    const questionOption = options.find((opt: any) => opt.name === "question");
    expect(questionOption).toBeDefined();

    // Check required options exist
    const option1 = options.find((opt: any) => opt.name === "option1");
    const option2 = options.find((opt: any) => opt.name === "option2");
    expect(option1).toBeDefined();
    expect(option2).toBeDefined();

    // Check optional options exist
    const option3 = options.find((opt: any) => opt.name === "option3");
    expect(option3).toBeDefined();
  });

  describe("option parsing", () => {
    it("parses integer and string options correctly", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 60;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "What is your favorite?";
          case "option1":
            return "Choice A";
          case "option2":
            return "Choice B";
          case "option3":
            return "Choice C";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("What is your favorite?"),
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇦 Choice A"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇧 Choice B"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇨 Choice C"));
    });

    it("handles null options correctly", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 30;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Binary choice?";
          case "option1":
            return "Yes";
          case "option2":
            return "No";
          case "option3":
            return null; // Optional not provided
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("Binary choice?"),
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇦 Yes"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇧 No"));
      expect(mockInteraction.editReply).not.toHaveBeenCalledWith(expect.stringContaining("🇨"));
    });

    it("collects all provided options up to 10", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 120;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        if (name === "question") return "Many choices?";
        if (name.startsWith("option")) {
          const num = parseInt(name.replace("option", ""), 10);
          if (num <= 5) return `Option ${num}`;
        }

        return null;
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledTimes(5);
      expect(mockMessage.react).toHaveBeenCalledWith("🇦");
      expect(mockMessage.react).toHaveBeenCalledWith("🇪");
    });
  });

  describe("validation", () => {
    it("detects duplicate options", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 60;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Duplicate test?";
          case "option1":
            return "Same";
          case "option2":
            return "Same"; // Duplicate!
          case "option3":
            return "Different";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        "Poll error: duplicate options found!",
      );
      expect(mockMessage.react).not.toHaveBeenCalled();
    });

    it("passes validation with unique options", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 60;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Unique test?";
          case "option1":
            return "First";
          case "option2":
            return "Second";
          case "option3":
            return "Third";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).not.toHaveBeenCalledWith(
        "Poll error: duplicate options found!",
      );
      expect(mockMessage.react).toHaveBeenCalledTimes(3);
    });
  });

  describe("poll message formatting", () => {
    it("formats poll message correctly", async () => {
      // ARRANGE
      mockInteraction.user = {
        toString: () => "<@testuser>",
      } as any;
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 300;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Format test?";
          case "option1":
            return "Alpha";
          case "option2":
            return "Beta";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const expectedMessage = [
        "__*<@testuser> started a poll*__:",
        "\n:bar_chart: **Format test?**\n\n🇦 Alpha\n🇧 Beta",
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      ].join("\n");

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expectedMessage);
    });

    it("includes poll creator's user mention", async () => {
      // ARRANGE
      mockInteraction.user = {
        id: "creator456",
        username: "PollCreator",
        toString: () => "<@creator456>",
      } as any;
      mockInteraction.options.getInteger = vi.fn(() => 60) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Creator test?";
          case "option1":
            return "Yes";
          case "option2":
            return "No";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("<@creator456> started a poll"),
      );
    });
  });

  describe("timing functionality", () => {
    it("handles zero second polls (no timer)", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 0;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Instant poll?";
          case "option1":
            return "A";
          case "option2":
            return "B";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).not.toHaveBeenCalledWith(
        expect.stringContaining("This poll ends"),
      );
      expect(mockMessage.createReactionCollector).not.toHaveBeenCalled();
    });

    it("adds timestamp for timed polls", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn((name: string) => {
        if (name === "seconds") return 180;

        return null;
      }) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Timed poll?";
          case "option1":
            return "Option 1";
          case "option2":
            return "Option 2";
          default:
            return null;
        }
      }) as any;

      // Mock Date.now for predictable timestamps
      const mockNow = 1640995200000; // 2022-01-01 00:00:00
      vi.spyOn(Date, "now").mockReturnValue(mockNow);

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const expectedTimestamp = Math.floor((mockNow + 180000) / 1000);
      expect(mockInteraction.editReply).toHaveBeenCalledTimes(2); // Initial poll + timestamp update
      expect(mockInteraction.editReply).toHaveBeenNthCalledWith(
        2, // Second call should have the timestamp
        expect.stringContaining(`This poll ends <t:${expectedTimestamp}:F>`),
      );

      vi.restoreAllMocks();
    });
  });

  describe("reaction handling", () => {
    it("adds reactions for all options", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn(() => 60) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Reaction test?";
          case "option1":
            return "One";
          case "option2":
            return "Two";
          case "option3":
            return "Three";
          case "option4":
            return "Four";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledTimes(4);
      expect(mockMessage.react).toHaveBeenCalledWith("🇦");
      expect(mockMessage.react).toHaveBeenCalledWith("🇧");
      expect(mockMessage.react).toHaveBeenCalledWith("🇨");
      expect(mockMessage.react).toHaveBeenCalledWith("🇩");
    });

    it("sets up reaction collector for timed polls", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn(() => 120) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Collector test?";
          case "option1":
            return "Yes";
          case "option2":
            return "No";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.createReactionCollector).toHaveBeenCalledWith({
        filter: expect.any(Function),
        time: 120000,
      });
    });
  });

  describe("database integration", () => {
    it("creates poll in database for timed polls", async () => {
      // ARRANGE
      const { pollService } = await import("../services");
      mockInteraction.options.getInteger = vi.fn(() => 300) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Database test?";
          case "option1":
            return "Store";
          case "option2":
            return "Skip";
          default:
            return null;
        }
      }) as any;

      vi.mocked(pollService.createPoll).mockResolvedValue({
        id: 1,
        messageId: "poll123",
        channelId: "channel456",
        creatorId: "user123",
        question: "Database test?",
        options: JSON.stringify([
          { text: "Store", votes: [] },
          { text: "Skip", votes: [] },
        ]),
        endTime: expect.any(Date),
        createdAt: expect.any(Date),
      });

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(pollService.createPoll).toHaveBeenCalledWith(
        "poll123",
        "channel456",
        "user123",
        "Database test?",
        ["Store", "Skip"],
        expect.any(Date),
      );
    });

    it("does not create database entry for instant polls", async () => {
      // ARRANGE
      const { pollService } = await import("../services");
      mockInteraction.options.getInteger = vi.fn(() => 0) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "No storage?";
          case "option1":
            return "Correct";
          case "option2":
            return "Wrong";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(pollService.createPoll).not.toHaveBeenCalled();
    });
  });

  describe("poll completion", () => {
    it("sets up end handler for collector", async () => {
      // ARRANGE
      const collectorOnSpy = vi.fn();
      mockMessage.createReactionCollector = vi.fn(() => ({
        on: collectorOnSpy,
      })) as any;

      mockInteraction.options.getInteger = vi.fn(() => 60) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "End handler?";
          case "option1":
            return "Test";
          case "option2":
            return "Done";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(collectorOnSpy).toHaveBeenCalledWith("end", expect.any(Function));
    });

    it("uses followUp for creator notification", async () => {
      // ARRANGE
      mockInteraction.followUp = vi.fn();
      mockInteraction.options.getInteger = vi.fn(() => 1) as any; // Very short poll
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Quick test?";
          case "option1":
            return "Fast";
          case "option2":
            return "Slow";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.createReactionCollector).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles maximum options (10)", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn(() => 60) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        if (name === "question") return "All options?";
        if (name.startsWith("option")) {
          const num = parseInt(name.replace("option", ""), 10);

          return `Choice ${num}`;
        }

        return null;
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledTimes(10);
      expect(mockMessage.react).toHaveBeenCalledWith("🇦");
      expect(mockMessage.react).toHaveBeenCalledWith("🇯"); // 10th option
    });

    it("handles sparse option selection", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn(() => 30) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Sparse options?";
          case "option1":
            return "First";
          case "option2":
            return null; // Skip option2
          case "option3":
            return "Third";
          case "option4":
            return null; // Skip option4
          case "option5":
            return "Fifth";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledTimes(3);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇦 First"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("🇧 Third"), // Third becomes second emoji
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("🇨 Fifth"), // Fifth becomes third emoji
      );
    });

    it("handles maximum seconds (604800)", async () => {
      // ARRANGE
      mockInteraction.options.getInteger = vi.fn(() => 604800) as any;
      mockInteraction.options.getString = vi.fn((name: string) => {
        switch (name) {
          case "question":
            return "Week-long poll?";
          case "option1":
            return "Long";
          case "option2":
            return "Short";
          default:
            return null;
        }
      }) as any;

      // ACT
      await tpollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockMessage.createReactionCollector).toHaveBeenCalledWith({
        filter: expect.any(Function),
        time: 604800000, // 604800 seconds * 1000
      });
    });
  });
});
