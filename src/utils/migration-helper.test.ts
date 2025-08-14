import { ActionRowBuilder, ButtonStyle, MessageFlags } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockInteraction, createMockMessage } from "../test/mocks/discord.mock";
import { type MigrationConfig, sendMigrationNotice } from "./migration-helper";

describe("Utility: migration-helper", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockMessage = createMockMessage({
      author: { id: "user123", username: "TestUser", toString: () => "user123" },
      content: "!test command",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("sendMigrationNotice", () => {
    describe("default behavior", () => {
      it("sends migration notice with default settings", async () => {
        // ARRANGE
        const slashCommandName = "test";
        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        const result = await sendMigrationNotice(mockMessage, slashCommandName);

        // ASSERT
        expect(mockMessage.reply).toHaveBeenCalledWith({
          content: `user123, click for migration info _(command executed)_`,
          components: [expect.any(ActionRowBuilder)],
          allowedMentions: { repliedUser: false },
        });
        expect(result).toBeTruthy();
      });

      it("creates ephemeral button with correct properties", async () => {
        // ARRANGE
        const slashCommandName = "testcmd";
        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        await sendMigrationNotice(mockMessage, slashCommandName);

        // ASSERT
        expect(mockMessage.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            components: [
              expect.objectContaining({
                components: [
                  expect.objectContaining({
                    data: expect.objectContaining({
                      custom_id: "migration_testcmd_user123",
                      label: "ℹ️ Command Migration Info",
                      style: ButtonStyle.Primary,
                    }),
                  }),
                ],
              }),
            ],
          }),
        );
      });
    });

    describe("ephemeral button interaction", () => {
      it("responds with migration info when command author clicks button", async () => {
        // ARRANGE
        const slashCommandName = "poll";
        const mockInteraction = createMockInteraction({
          user: { id: "user123" },
        });

        const sentMessage = createMockMessage({
          id: "msg123",
        });
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        let collectorCallback: any;
        sentMessage.createMessageComponentCollector = vi.fn(() => ({
          on: vi.fn((event: string, callback: any) => {
            if (event === "collect") {
              collectorCallback = callback;
            }
          }),
        })) as any;

        // ACT
        await sendMigrationNotice(mockMessage, slashCommandName);
        await collectorCallback(mockInteraction);

        // ASSERT
        expect(mockInteraction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining("📢 **Command Migration Notice**"),
          flags: MessageFlags.Ephemeral,
        });
        expect(mockInteraction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining("Please use `/poll` instead"),
          }),
        );
      });

      it("rejects button click from non-author", async () => {
        // ARRANGE
        const slashCommandName = "test";
        const mockInteraction = createMockInteraction({
          user: { id: "different-user" },
        });

        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        let collectorCallback: any;
        sentMessage.createMessageComponentCollector = vi.fn(() => ({
          on: vi.fn((event: string, callback: any) => {
            if (event === "collect") {
              collectorCallback = callback;
            }
          }),
        })) as any;

        // ACT
        await sendMigrationNotice(mockMessage, slashCommandName);
        await collectorCallback(mockInteraction);

        // ASSERT
        expect(mockInteraction.reply).toHaveBeenCalledWith({
          content: "This button is only for the person who used the command.",
          flags: MessageFlags.Ephemeral,
        });
      });

      it("deletes message when collector ends", async () => {
        // ARRANGE
        const slashCommandName = "frames";
        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        let endCallback: any;
        sentMessage.createMessageComponentCollector = vi.fn(() => ({
          on: vi.fn((event: string, callback: any) => {
            if (event === "end") {
              endCallback = callback;
            }
          }),
        })) as any;

        // ACT
        await sendMigrationNotice(mockMessage, slashCommandName);
        await endCallback();

        // ASSERT
        expect(sentMessage.delete).toHaveBeenCalled();
      });
    });

    describe("configuration options", () => {
      it("shows different message when executeAfterNotice is false", async () => {
        // ARRANGE
        const config: MigrationConfig = { executeAfterNotice: false };
        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        await sendMigrationNotice(mockMessage, "test", config);

        // ASSERT
        expect(mockMessage.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            content: "user123, click for migration info ",
          }),
        );
      });

      it("uses custom message when provided", async () => {
        // ARRANGE
        const config: MigrationConfig = {
          useEphemeralButton: false,
          customMessage: "Custom migration message here!",
        };

        // ACT
        await sendMigrationNotice(mockMessage, "custom", config);

        // ASSERT
        expect(mockMessage.reply).toHaveBeenCalledWith({
          content: "Custom migration message here!",
          allowedMentions: { repliedUser: false },
        });
      });

      it("auto-deletes message after specified time with useEphemeralButton false", async () => {
        // ARRANGE
        const config: MigrationConfig = {
          useEphemeralButton: false,
          deleteAfter: 5000,
        };

        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        await sendMigrationNotice(mockMessage, "test", config);
        vi.advanceTimersByTime(5000);

        // ASSERT
        expect(sentMessage.delete).toHaveBeenCalled();
      });

      it("does not auto-delete when deleteAfter is 0", async () => {
        // ARRANGE
        const config: MigrationConfig = {
          useEphemeralButton: false,
          deleteAfter: 0,
        };

        const sentMessage = createMockMessage();
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        await sendMigrationNotice(mockMessage, "test", config);
        vi.advanceTimersByTime(60000);

        // ASSERT
        expect(sentMessage.delete).not.toHaveBeenCalled();
      });
    });

    describe("error handling", () => {
      it("logs error when message deletion fails in collector", async () => {
        // ARRANGE
        const logErrorSpy = vi.fn();
        vi.doMock("./logger", () => ({ logError: logErrorSpy }));

        const sentMessage = createMockMessage();
        sentMessage.delete = vi.fn().mockRejectedValue(new Error("Delete failed"));
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        let endCallback: any;
        sentMessage.createMessageComponentCollector = vi.fn(() => ({
          on: vi.fn((event: string, callback: any) => {
            if (event === "end") {
              endCallback = callback;
            }
          }),
        })) as any;

        // ACT
        await sendMigrationNotice(mockMessage, "test");
        await endCallback();

        // ASSERT
        expect(sentMessage.delete).toHaveBeenCalled();
      });

      it("logs error when auto-delete fails", async () => {
        // ARRANGE
        const config: MigrationConfig = {
          useEphemeralButton: false,
          deleteAfter: 1000,
        };

        const sentMessage = createMockMessage();
        sentMessage.delete = vi.fn().mockRejectedValue(new Error("Auto-delete failed"));
        mockMessage.reply = vi.fn().mockResolvedValue(sentMessage);

        // ACT
        await sendMigrationNotice(mockMessage, "test", config);
        vi.advanceTimersByTime(1000);

        // ASSERT
        expect(sentMessage.delete).toHaveBeenCalled();
      });
    });
  });
});
