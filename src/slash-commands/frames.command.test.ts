import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { FramesService } from "../services/frames.service";
import { createMockInteraction } from "../test/mocks/discord.mock";
import framesSlashCommand from "./frames.command";

describe("SlashCommand: frames", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "frames",
      options: {
        getString: mock(() => "1h"),
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("is defined", () => {
    expect(framesSlashCommand).toBeDefined();
    expect(framesSlashCommand.data.name).toBe("frames");
    expect(framesSlashCommand.legacyName).toBe("frames");
  });

  describe("execute", () => {
    it("shows error message for invalid input", async () => {
      // ARRANGE
      mockInteraction.options.getString = mock(() => "invalid input");
      spyOn(FramesService, "processInput").mockReturnValue(null);

      // ACT
      await framesSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining("Invalid format: `invalid input`"),
        ephemeral: true,
      });
    });

    it("processes valid time input", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `1h 0min 0s 0ms`\n**FPS:** `60`\n**Frames:** `216000 (0x34bc0)`";
      mockInteraction.options.getString = mock(() => "1h");
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("1h");
      expect(mockInteraction.reply).toHaveBeenCalledWith(expectedOutput);
    });

    it("processes valid frame input", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `0h 1min 0s 0ms`\n**FPS:** `60`\n**Frames:** `3600 (0xe10)`";
      mockInteraction.options.getString = mock(() => "3600");
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("3600");
      expect(mockInteraction.reply).toHaveBeenCalledWith(expectedOutput);
    });

    it("processes input with custom FPS", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `0h 0min 30s 0ms`\n**FPS:** `30`\n**Frames:** `900 (0x384)`";
      mockInteraction.options.getString = mock(() => "30s 30fps");
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(FramesService.processInput).toHaveBeenCalledWith("30s 30fps");
      expect(mockInteraction.reply).toHaveBeenCalledWith(expectedOutput);
    });

    it("retrieves required input option", async () => {
      // ARRANGE
      const expectedOutput =
        "**Time:** `0h 2min 0s 0ms`\n**FPS:** `60`\n**Frames:** `7200 (0x1c20)`";
      mockInteraction.options.getString = mock(() => "2min");
      spyOn(FramesService, "processInput").mockReturnValue(expectedOutput);

      // ACT
      await framesSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.options.getString).toHaveBeenCalledWith("input", true);
    });
  });
});
