import { describe, expect, it } from "vitest";

import { FramesService } from "./frames.service";

describe("Service: FramesService", () => {
  describe("parseInput", () => {
    it("is defined", () => {
      expect(FramesService.parseInput).toBeDefined();
    });

    describe("time format parsing", () => {
      it("parses hours, minutes, seconds, and milliseconds", () => {
        // ACT
        const result = FramesService.parseInput("1h 30min 45s 500ms");

        // ASSERT
        expect(result).toEqual({
          hours: 1,
          minutes: 30,
          seconds: 45,
          milliseconds: 500,
          fps: 60,
        });
      });

      it("parses partial time components", () => {
        // ACT
        const result = FramesService.parseInput("5min 30s");

        // ASSERT
        expect(result).toEqual({
          hours: 0,
          minutes: 5,
          seconds: 30,
          milliseconds: 0,
          fps: 60,
        });
      });

      it("parses decimal values", () => {
        // ACT
        const result = FramesService.parseInput("1.5h 2.5min 3.5s");

        // ASSERT
        expect(result).toEqual({
          hours: 1.5,
          minutes: 2.5,
          seconds: 3.5,
          milliseconds: 0,
          fps: 60,
        });
      });

      it("parses time with custom FPS", () => {
        // ACT
        const result = FramesService.parseInput("1min 30fps");

        // ASSERT
        expect(result).toEqual({
          hours: 0,
          minutes: 1,
          seconds: 0,
          milliseconds: 0,
          fps: 30,
        });
      });

      it("handles variations in spacing", () => {
        // ACT
        const result = FramesService.parseInput("2h5min10s");

        // ASSERT
        expect(result).toEqual({
          hours: 2,
          minutes: 5,
          seconds: 10,
          milliseconds: 0,
          fps: 60,
        });
      });
    });

    describe("frames format parsing", () => {
      it("parses decimal frame count", () => {
        // ACT
        const result = FramesService.parseInput("123");

        // ASSERT
        expect(result).toEqual({
          frames: 123,
          fps: 60,
        });
      });

      it("parses frame count with custom FPS", () => {
        // ACT
        const result = FramesService.parseInput("500 30fps");

        // ASSERT
        expect(result).toEqual({
          frames: 500,
          fps: 30,
        });
      });

      it("parses hexadecimal frame count", () => {
        // ACT
        const result = FramesService.parseInput("0xFF");

        // ASSERT
        expect(result).toEqual({
          frames: 255,
          fps: 60,
        });
      });

      it("parses hex with lowercase x", () => {
        // ACT
        const result = FramesService.parseInput("0xff");

        // ASSERT
        expect(result).toEqual({
          frames: 255,
          fps: 60,
        });
      });

      it("parses hex with custom FPS", () => {
        // ACT
        const result = FramesService.parseInput("0x100 25fps");

        // ASSERT
        expect(result).toEqual({
          frames: 256,
          fps: 25,
        });
      });
    });

    describe("invalid input handling", () => {
      it("returns null for empty input", () => {
        // ACT
        const result = FramesService.parseInput("");

        // ASSERT
        expect(result).toBeNull();
      });

      it("returns null for zero frames", () => {
        // ACT
        const result = FramesService.parseInput("0");

        // ASSERT
        expect(result).toBeNull();
      });

      it("returns null for zero time", () => {
        // ACT
        const result = FramesService.parseInput("0h 0min 0s");

        // ASSERT
        expect(result).toBeNull();
      });

      it("returns null for invalid format", () => {
        // ACT
        const result = FramesService.parseInput("invalid input");

        // ASSERT
        expect(result).toBeNull();
      });

      it("returns null for negative FPS", () => {
        // ACT
        const result = FramesService.parseInput("100 -30fps");

        // ASSERT
        expect(result).toBeNull();
      });
    });
  });

  describe("convertTimeToFrames", () => {
    it("is defined", () => {
      expect(FramesService.convertTimeToFrames).toBeDefined();
    });

    it("converts time to frames at 60 FPS", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(0, 1, 0, 0, 60);

      // ASSERT
      expect(frames).toBe(3600); // 1 minute at 60 FPS
    });

    it("converts time to frames at 30 FPS", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(0, 1, 0, 0, 30);

      // ASSERT
      expect(frames).toBe(1800); // 1 minute at 30 FPS
    });

    it("handles hours correctly", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(1, 0, 0, 0, 60);

      // ASSERT
      expect(frames).toBe(216000); // 1 hour at 60 FPS
    });

    it("handles milliseconds correctly", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(0, 0, 0, 500, 60);

      // ASSERT
      expect(frames).toBe(30); // 500ms at 60 FPS
    });

    it("handles combined time components", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(1, 30, 45, 500, 60);

      // ASSERT
      expect(frames).toBe(326730); // 1h 30min 45s 500ms at 60 FPS
    });

    it("rounds to nearest frame", () => {
      // ACT
      const frames = FramesService.convertTimeToFrames(0, 0, 0, 16, 60);

      // ASSERT
      expect(frames).toBe(1); // 16ms at 60 FPS rounds to 1 frame
    });
  });

  describe("convertFramesToTime", () => {
    it("is defined", () => {
      expect(FramesService.convertFramesToTime).toBeDefined();
    });

    it("converts frames to time at 60 FPS", () => {
      // ACT
      const time = FramesService.convertFramesToTime(3600, 60);

      // ASSERT
      expect(time).toEqual({
        hours: 0,
        minutes: 1,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("converts frames to time at 30 FPS", () => {
      // ACT
      const time = FramesService.convertFramesToTime(1800, 30);

      // ASSERT
      expect(time).toEqual({
        hours: 0,
        minutes: 1,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("handles large frame counts", () => {
      // ACT
      const time = FramesService.convertFramesToTime(216000, 60);

      // ASSERT
      expect(time).toEqual({
        hours: 1,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("calculates milliseconds correctly", () => {
      // ACT
      const time = FramesService.convertFramesToTime(61, 60);

      // ASSERT
      expect(time).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 1,
        milliseconds: 17, // 1/60 second ≈ 16.67ms rounds to 17
      });
    });

    it("handles complex conversions", () => {
      // ACT
      const time = FramesService.convertFramesToTime(326730, 60);

      // ASSERT
      expect(time).toEqual({
        hours: 1,
        minutes: 30,
        seconds: 45,
        milliseconds: 500,
      });
    });
  });

  describe("formatOutput", () => {
    it("is defined", () => {
      expect(FramesService.formatOutput).toBeDefined();
    });

    it("formats output correctly", () => {
      // ACT
      const output = FramesService.formatOutput(1, 30, 45, 500, 60, 326730);

      // ASSERT
      expect(output).toBe(
        "**Time:** `1h 30min 45s 500ms`\n" + "**FPS:** `60`\n" + "**Frames:** `326730 (0x4fc4a)`",
      );
    });

    it("formats zero values correctly", () => {
      // ACT
      const output = FramesService.formatOutput(0, 0, 10, 0, 30, 300);

      // ASSERT
      expect(output).toBe(
        "**Time:** `0h 0min 10s 0ms`\n" + "**FPS:** `30`\n" + "**Frames:** `300 (0x12c)`",
      );
    });

    it("formats hex with lowercase", () => {
      // ACT
      const output = FramesService.formatOutput(0, 0, 4, 250, 60, 255);

      // ASSERT
      expect(output).toBe(
        "**Time:** `0h 0min 4s 250ms`\n" + "**FPS:** `60`\n" + "**Frames:** `255 (0xff)`",
      );
    });
  });

  describe("processInput", () => {
    it("is defined", () => {
      expect(FramesService.processInput).toBeDefined();
    });

    it("processes time input correctly", () => {
      // ACT
      const output = FramesService.processInput("1h 5min 15s");

      // ASSERT
      expect(output).toBe(
        "**Time:** `1h 5min 15s 0ms`\n" + "**FPS:** `60`\n" + "**Frames:** `234900 (0x39594)`",
      );
    });

    it("processes frame input correctly", () => {
      // ACT
      const output = FramesService.processInput("3600");

      // ASSERT
      expect(output).toBe(
        "**Time:** `0h 1min 0s 0ms`\n" + "**FPS:** `60`\n" + "**Frames:** `3600 (0xe10)`",
      );
    });

    it("processes hex frame input correctly", () => {
      // ACT
      const output = FramesService.processInput("0xFF");

      // ASSERT
      expect(output).toBe(
        "**Time:** `0h 0min 4s 250ms`\n" + "**FPS:** `60`\n" + "**Frames:** `255 (0xff)`",
      );
    });

    it("processes input with custom FPS", () => {
      // ACT
      const output = FramesService.processInput("30s 30fps");

      // ASSERT
      expect(output).toBe(
        "**Time:** `0h 0min 30s 0ms`\n" + "**FPS:** `30`\n" + "**Frames:** `900 (0x384)`",
      );
    });

    it("returns null for invalid input", () => {
      // ACT
      const output = FramesService.processInput("invalid");

      // ASSERT
      expect(output).toBeNull();
    });
  });
});
