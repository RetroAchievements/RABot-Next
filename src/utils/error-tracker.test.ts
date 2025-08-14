import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockInteraction, createMockMessage } from "../test/mocks/discord.mock";
import { ErrorTracker } from "./error-tracker";
import * as logger from "./logger";

describe("Util: ErrorTracker", () => {
  beforeEach(() => {
    // ... spy on logger functions ...
    vi.spyOn(logger, "logError").mockImplementation(() => {});
  });

  describe("trackMessageError", () => {
    it("tracks an error with full message context", () => {
      // ARRANGE
      const error = new Error("Test error");
      const message = createMockMessage({
        id: "msg123",
        author: { id: "user456" } as any,
        guildId: "guild789",
        channelId: "channel012",
      });

      // ACT
      ErrorTracker.trackMessageError(error, message, "testcommand");

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(error, {
        userId: "user456",
        guildId: "guild789",
        channelId: "channel012",
        commandName: "testcommand",
        messageId: "msg123",
        userAction: "message_command",
        errorType: "Error",
        stackTrace: error.stack,
      });
    });

    it("handles errors in DMs (no guild)", () => {
      // ARRANGE
      const error = new Error("DM error");
      const message = createMockMessage({
        guildId: null,
      });

      // ACT
      ErrorTracker.trackMessageError(error, message);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(error, {
        userId: message.author.id,
        guildId: undefined,
        channelId: message.channelId,
        commandName: "unknown",
        messageId: message.id,
        userAction: "message_command",
        errorType: "Error",
        stackTrace: error.stack,
      });
    });

    it("includes additional context when provided", () => {
      // ARRANGE
      const error = new Error("Test error");
      const message = createMockMessage();
      const additionalContext = {
        errorCode: "ERR_001",
        additionalData: { key: "value" },
      };

      // ACT
      ErrorTracker.trackMessageError(error, message, "test", additionalContext);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          errorCode: "ERR_001",
          additionalData: { key: "value" },
        }),
      );
    });

    it("handles non-Error objects", () => {
      // ARRANGE
      const error = "String error";
      const message = createMockMessage();

      // ACT
      ErrorTracker.trackMessageError(error, message);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          errorType: "UnknownError",
          stackTrace: undefined,
        }),
      );
    });
  });

  describe("trackInteractionError", () => {
    it("tracks an error with full interaction context", () => {
      // ARRANGE
      const error = new Error("Interaction error");
      const interaction = createMockInteraction({
        id: "int123",
        commandName: "testslash",
        user: { id: "user456" } as any,
        guildId: "guild789",
        channelId: "channel012",
      });

      // ACT
      ErrorTracker.trackInteractionError(error, interaction);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(error, {
        userId: "user456",
        guildId: "guild789",
        channelId: "channel012",
        commandName: "testslash",
        interactionId: "int123",
        userAction: "slash_command",
        errorType: "Error",
        stackTrace: error.stack,
      });
    });

    it("handles interactions in DMs", () => {
      // ARRANGE
      const error = new Error("DM interaction error");
      const interaction = createMockInteraction({
        guildId: null,
      });

      // ACT
      ErrorTracker.trackInteractionError(error, interaction);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          guildId: undefined,
        }),
      );
    });
  });

  describe("trackError", () => {
    it("tracks an error with custom context", () => {
      // ARRANGE
      const error = new Error("Custom error");
      const context = {
        userId: "user123",
        userAction: "custom_action",
        errorCode: "CUSTOM_001",
      };

      // ACT
      ErrorTracker.trackError(error, context);

      // ASSERT
      expect(logger.logError).toHaveBeenCalledWith(error, {
        userId: "user123",
        userAction: "custom_action",
        errorCode: "CUSTOM_001",
        errorType: "Error",
        stackTrace: error.stack,
      });
    });
  });

  describe("generateErrorId", () => {
    it("generates unique error IDs", () => {
      // ACT
      const id1 = ErrorTracker.generateErrorId();
      const id2 = ErrorTracker.generateErrorId();

      // ASSERT
      expect(id1).toMatch(/^err_\d+_[a-z0-9]{7}$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]{7}$/);
      expect(id1).not.toEqual(id2);
    });

    it("includes timestamp in error ID", () => {
      // ARRANGE
      const timeBefore = Date.now();

      // ACT
      const errorId = ErrorTracker.generateErrorId();

      // ASSERT
      const timestamp = parseInt(errorId.split("_")[1]!);
      expect(timestamp).toBeGreaterThanOrEqual(timeBefore);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("formatUserError", () => {
    it("formats missing access errors", () => {
      // ARRANGE
      const error = new Error("Missing Access");

      // ACT
      const formatted = ErrorTracker.formatUserError(error);

      // ASSERT
      expect(formatted).toContain("❌ I don't have permission to perform this action");
      expect(formatted).toContain("Error ID: err_");
    });

    it("formats unknown message errors", () => {
      // ARRANGE
      const error = new Error("Unknown Message");

      // ACT
      const formatted = ErrorTracker.formatUserError(error);

      // ASSERT
      expect(formatted).toContain("❌ The message was deleted or I can't access it");
    });

    it("formats rate limit errors", () => {
      // ARRANGE
      const error = new Error("You are being rate limited");

      // ACT
      const formatted = ErrorTracker.formatUserError(error);

      // ASSERT
      expect(formatted).toContain("❌ I'm being rate limited");
      expect(formatted).toContain("Please try again in a moment");
    });

    it("formats generic errors", () => {
      // ARRANGE
      const error = new Error("Some unknown error");

      // ACT
      const formatted = ErrorTracker.formatUserError(error);

      // ASSERT
      expect(formatted).toContain("❌ An unexpected error occurred");
      expect(formatted).toContain("Please try again later");
    });

    it("uses provided error ID when given", () => {
      // ARRANGE
      const error = new Error("Test error");
      const customId = "custom_error_123";

      // ACT
      const formatted = ErrorTracker.formatUserError(error, customId);

      // ASSERT
      expect(formatted).toContain(`Error ID: ${customId}`);
    });

    it("handles non-Error objects", () => {
      // ARRANGE
      const error = "String error";

      // ACT
      const formatted = ErrorTracker.formatUserError(error);

      // ASSERT
      expect(formatted).toContain("❌ An unexpected error occurred");
    });
  });
});
