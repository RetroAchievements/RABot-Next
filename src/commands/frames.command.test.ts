import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { FramesService } from "../services/frames.service";
import { createMockMessage } from "../test/mocks/discord.mock";
import framesCommand from "./frames.command";

describe("Command: frames", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    mock.restore();
  });

  it("is defined", () => {
    expect(framesCommand).toBeDefined();
    expect(framesCommand.name).toBe("frames");
    expect(framesCommand.category).toBe("utility");
  });

  describe("execute", () => {
    it("shows error message when no arguments provided", async () => {
      // ACT
      await framesCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Please provide a time duration or frame count. Use `!help frames` to see examples.",
      );
    });

    it("shows error message for invalid input", async () => {
      // ARRANGE
      spyOn(FramesService, "processInput").mockReturnValue(null);

      // ACT
      await framesCommand.execute(mockMessage, ["invalid", "input"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Invalid time format: `invalid input`\nUse `!help frames` to see some useful examples.",
      );
    });

    it("processes valid time input", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `1h 0min 0s 0ms`\n**FPS:** `60`\n**Frames:** `216000 (0x34bc0)`";
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesCommand.execute(mockMessage, ["1h"], {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("1h");
      expect(mockMessage.reply).toHaveBeenCalledWith(expectedOutput);
    });

    it("processes valid frame input", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `0h 1min 0s 0ms`\n**FPS:** `60`\n**Frames:** `3600 (0xe10)`";
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesCommand.execute(mockMessage, ["3600"], {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("3600");
      expect(mockMessage.reply).toHaveBeenCalledWith(expectedOutput);
    });

    it("joins multiple arguments correctly", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `1h 30min 0s 0ms`\n**FPS:** `30`\n**Frames:** `162000 (0x27990)`";
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesCommand.execute(mockMessage, ["1h", "30min", "30fps"], {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("1h 30min 30fps");
      expect(mockMessage.reply).toHaveBeenCalledWith(expectedOutput);
    });
  });
});
