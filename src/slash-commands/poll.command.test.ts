import type { Message } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockInteraction } from "../test/mocks/discord.mock";
import pollSlashCommand from "./poll.command";

describe("SlashCommand: poll", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;
  let mockMessage: Message;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "poll",
    });

    mockMessage = {
      react: vi.fn().mockResolvedValue(undefined),
    } as unknown as Message;

    mockInteraction.editReply = vi.fn().mockResolvedValue(mockMessage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("has correct command data", () => {
    // ASSERT
    expect(pollSlashCommand.data.name).toBe("poll");
    expect(pollSlashCommand.data.description).toBe("Create a simple poll");
  });

  describe("execute", () => {
    it("creates a poll with two options", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "What's your favorite color?";
          case "option1":
            return "Red";
          case "option2":
            return "Blue";
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("What's your favorite color?"),
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇦 Red"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇧 Blue"));
      expect(mockMessage.react).toHaveBeenCalledTimes(2);
      expect(mockMessage.react).toHaveBeenCalledWith("🇦");
      expect(mockMessage.react).toHaveBeenCalledWith("🇧");
    });

    it("creates a poll with maximum 10 options", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        if (name === "question") return "Pick a number";
        if (name.startsWith("option")) {
          const num = name.replace("option", "");

          return `Option ${num}`;
        }

        return null;
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("Pick a number"),
      );
      expect(mockMessage.react).toHaveBeenCalledTimes(10);
    });

    it("detects and rejects duplicate options", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "Choose one";
          case "option1":
            return "Same";
          case "option2":
            return "Same";
          case "option3":
            return "Different";
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        "Poll error: duplicate options found!",
      );
      expect(mockMessage.react).not.toHaveBeenCalled();
    });

    it("includes the poll creator's username in the message", async () => {
      // ARRANGE
      mockInteraction.user = {
        id: "123456789",
        username: "TestUser",
        toString: () => "<@123456789>",
      } as any;

      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "Yes or No?";
          case "option1":
            return "Yes";
          case "option2":
            return "No";
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("<@123456789> started a poll"),
      );
    });

    it("handles polls with only required options", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "Binary choice";
          case "option1":
            return "Option A";
          case "option2":
            return "Option B";
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledOnce();
      expect(mockMessage.react).toHaveBeenCalledTimes(2);
    });

    it("ignores empty optional options", async () => {
      // ARRANGE
      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "How many options?";
          case "option1":
            return "First";
          case "option2":
            return "Second";
          case "option3":
            return "Third";
          case "option4":
            return null; // Empty option.
          case "option5":
            return "Fifth"; // Should still be included.
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇦 First"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇧 Second"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇨 Third"));
      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining("🇩 Fifth"));
      expect(mockMessage.react).toHaveBeenCalledTimes(4);
      expect(mockMessage.react).toHaveBeenCalledWith("🇦");
      expect(mockMessage.react).toHaveBeenCalledWith("🇧");
      expect(mockMessage.react).toHaveBeenCalledWith("🇨");
      expect(mockMessage.react).toHaveBeenCalledWith("🇩");
    });

    it("formats the poll message correctly", async () => {
      // ARRANGE
      mockInteraction.user = {
        toString: () => "<@999999999>",
      } as any;

      mockInteraction.options.getString = vi.fn((name: string, _required?: boolean) => {
        switch (name) {
          case "question":
            return "Test Question?";
          case "option1":
            return "Answer 1";
          case "option2":
            return "Answer 2";
          default:
            return null;
        }
      }) as any;

      // ACT
      await pollSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const expectedMessage = [
        "__*<@999999999> started a poll*__:",
        "\n:bar_chart: **Test Question?**\n\n🇦 Answer 1\n🇧 Answer 2",
      ].join("\n");

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expectedMessage);
    });
  });
});
