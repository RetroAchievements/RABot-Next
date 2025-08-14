import { ChannelType } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockClient,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
} from "../test/mocks/discord.mock";
import pollCommand from "./poll.command";

describe("Command: poll", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockChannel: ReturnType<typeof createMockTextChannel>;

  beforeEach(() => {
    mockChannel = createMockTextChannel();
    mockChannel.send = vi.fn().mockResolvedValue({
      id: "poll123",
      react: vi.fn().mockResolvedValue({}),
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
    expect(pollCommand.name).toBe("poll");
    expect(pollCommand.description).toBe("Create a (useless) poll");
    expect(pollCommand.category).toBe("utility");
    expect(pollCommand.usage).toBe("!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'");
    expect(pollCommand.examples).toHaveLength(1);
    expect(pollCommand.examples?.[0]).toBe(
      "!poll 'Which option you choose?' 'option one' 'option 2' 'option N'",
    );
    expect(pollCommand.cooldown).toBe(10);
  });

  describe("argument parsing", () => {
    it("parses single quoted arguments correctly", async () => {
      // ARRANGE
      mockMessage.content = "!poll 'What is your favorite color?' 'Red' 'Blue' 'Green'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

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
      mockMessage.content = '!poll "Choose wisely" "Option A" "Option B"';

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("Choose wisely"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇦 Option A"));
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("🇧 Option B"));
    });

    it("fails when no arguments provided", async () => {
      // ARRANGE
      mockMessage.content = "!poll";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("fails when only question provided", async () => {
      // ARRANGE
      mockMessage.content = "!poll 'Only a question?'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("fails with insufficient quoted arguments", async () => {
      // ARRANGE
      mockMessage.content = "!poll 'Question?' 'Only one option'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("validates question length - empty", async () => {
      // ARRANGE
      mockMessage.content = "!poll '' 'A' 'B'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates question length - too long (400+ chars)", async () => {
      // ARRANGE
      const longQuestion = "A".repeat(400); // 400 chars should be rejected
      mockMessage.content = `!poll '${longQuestion}' 'A' 'B'`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates question length - way too long", async () => {
      // ARRANGE
      const longQuestion = "A".repeat(500); // Way over limit
      mockMessage.content = `!poll '${longQuestion}' 'A' 'B'`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("Invalid question");
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates option count - too few", async () => {
      // ARRANGE
      mockMessage.content = "!poll 'Question?' 'Only one'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Usage: `!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("validates option count - too many", async () => {
      // ARRANGE
      const manyOptions = Array.from({ length: 11 }, (_, i) => `'Option ${i + 1}'`).join(" ");
      mockMessage.content = `!poll 'Question?' ${manyOptions}`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "The number of options must be greater than 2 and less than 10",
      );
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    it("detects duplicate options", async () => {
      // ARRANGE
      mockMessage.content = "!poll 'Question?' 'Same' 'Same' 'Different'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**`poll` error**: repeated options found: `Same`",
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
      mockMessage.content = "!poll 'Question?' 'A' 'B'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

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
        content: "!poll 'What is best?' 'Option A' 'Option B' 'Option C'",
      });

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      const expectedMessage = [
        "__*<@user789> started a poll*__:",
        "\n:bar_chart: **What is best?**\n\n🇦 Option A\n🇧 Option B\n🇨 Option C",
      ].join("\n");

      expect(mockChannel.send).toHaveBeenCalledWith(expectedMessage);
    });

    it("creates reactions for all options", async () => {
      // ARRANGE
      const sentMessage = {
        id: "poll123",
        react: vi.fn().mockResolvedValue({}),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = "!poll 'Question?' 'A' 'B' 'C'";

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(sentMessage.react).toHaveBeenCalledTimes(3);
      expect(sentMessage.react).toHaveBeenCalledWith("🇦");
      expect(sentMessage.react).toHaveBeenCalledWith("🇧");
      expect(sentMessage.react).toHaveBeenCalledWith("🇨");
    });
  });

  describe("edge cases", () => {
    it("handles maximum options (10)", async () => {
      // ARRANGE
      const tenOptions = Array.from({ length: 10 }, (_, i) => `'Option ${i + 1}'`).join(" ");
      mockMessage.content = `!poll 'Many options?' ${tenOptions}`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining("Many options?"));
      expect(mockMessage.reply).not.toHaveBeenCalledWith(
        expect.stringContaining("number of options must be"),
      );
    });

    it("handles question at maximum valid length (399 chars)", async () => {
      // ARRANGE
      const maxQuestion = "A".repeat(399);
      const sentMessage = {
        id: "poll123",
        react: vi.fn().mockResolvedValue({}),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = `!poll '${maxQuestion}' 'A' 'B'`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining(maxQuestion));
      expect(mockMessage.reply).not.toHaveBeenCalledWith("Invalid question");
    });

    it("creates reactions for maximum number of options", async () => {
      // ARRANGE
      const tenOptions = Array.from({ length: 10 }, (_, i) => `'Option ${i + 1}'`).join(" ");
      const sentMessage = {
        id: "poll123",
        react: vi.fn().mockResolvedValue({}),
      };
      mockChannel.send = vi.fn().mockResolvedValue(sentMessage);
      mockMessage.content = `!poll 'Test?' ${tenOptions}`;

      // ACT
      await pollCommand.execute(mockMessage, [], mockClient);

      // ASSERT
      expect(sentMessage.react).toHaveBeenCalledTimes(10);
      // Check first few and last emoji
      expect(sentMessage.react).toHaveBeenCalledWith("🇦");
      expect(sentMessage.react).toHaveBeenCalledWith("🇧");
      expect(sentMessage.react).toHaveBeenCalledWith("🇯"); // 10th option
    });
  });
});
