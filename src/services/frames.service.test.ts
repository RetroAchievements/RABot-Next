import { describe, expect, it } from "vitest";

import { FramesService } from "./frames.service";

describe("Service: FramesService", () => {
  describe("parseInput", () => {
    it("is defined", () => {
      expect(FramesService.parseInput).toBeDefined();
    });

    describe("time format parsing", () => {
      it("parses hours, minutes, seconds, and milliseconds", () => {
        const result = FramesService.parseInput("1h 30min 45s 500ms");
        expect(result).toEqual({
          hours: 1,
          minutes: 30,
          seconds: 45,
          milliseconds: 500,
          fps: 60,
        });
      });

      it("parses partial time components", () => {
        const result = FramesService.parseInput("5min 30s");
        expect(result).toEqual({
          hours: 0,
          minutes: 5,
          seconds: 30,
          milliseconds: 0,
          fps: 60,
        });
      });

      it("parses decimal values", () => {
        const result = FramesService.parseInput("1.5h 2.5min 3.5s");
        expect(result).toEqual({
          hours: 1.5,
          minutes: 2.5,
          seconds: 3.5,
          milliseconds: 0,
          fps: 60,
        });
      });

      it("parses time with custom FPS", () => {
        const result = FramesService.parseInput("1min 30fps");
        expect(result).toEqual({
          hours: 0,
          minutes: 1,
          seconds: 0,
          milliseconds: 0,
          fps: 30,
        });
      });

      it("handles variations in spacing", () => {
        const result = FramesService.parseInput("2h5min10s");
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
        const result = FramesService.parseInput("123");
        expect(result).toEqual({
          frames: 123,
          fps: 60,
        });
      });

      it("parses frame count with custom FPS", () => {
        const result = FramesService.parseInput("500 30fps");
        expect(result).toEqual({
          frames: 500,
          fps: 30,
        });
      });

      it("parses hexadecimal frame count", () => {
        const result = FramesService.parseInput("0xFF");
        expect(result).toEqual({
          frames: 255,
          fps: 60,
        });
      });

      it("parses hex with lowercase x", () => {
        const result = FramesService.parseInput("0xff");
        expect(result).toEqual({
          frames: 255,
          fps: 60,
        });
      });

      it("parses hex with custom FPS", () => {
        const result = FramesService.parseInput("0x100 25fps");
        expect(result).toEqual({
          frames: 256,
          fps: 25,
        });
      });
    });

    describe("invalid input handling", () => {
      it("returns null for empty input", () => {
        const result = FramesService.parseInput("");
        expect(result).toBeNull();
      });

      it("returns null for zero frames", () => {
        const result = FramesService.parseInput("0");
        expect(result).toBeNull();
      });

      it("returns null for zero time", () => {
        const result = FramesService.parseInput("0h 0min 0s");
        expect(result).toBeNull();
      });

      it("returns null for invalid format", () => {
        const result = FramesService.parseInput("invalid input");
        expect(result).toBeNull();
      });

      it("returns null for negative FPS", () => {
        const result = FramesService.parseInput("100 -30fps");
        expect(result).toBeNull();
      });
    });
  });

  describe("convertTimeToFrames", () => {
    it("is defined", () => {
      expect(FramesService.convertTimeToFrames).toBeDefined();
    });

    it("converts time to frames at 60 FPS", () => {
      const frames = FramesService.convertTimeToFrames(0, 1, 0, 0, 60);
      expect(frames).toBe(3600); // 1 minute at 60 FPS
    });

    it("converts time to frames at 30 FPS", () => {
      const frames = FramesService.convertTimeToFrames(0, 1, 0, 0, 30);
      expect(frames).toBe(1800); // 1 minute at 30 FPS
    });

    it("handles hours correctly", () => {
      const frames = FramesService.convertTimeToFrames(1, 0, 0, 0, 60);
      expect(frames).toBe(216000); // 1 hour at 60 FPS
    });

    it("handles milliseconds correctly", () => {
      const frames = FramesService.convertTimeToFrames(0, 0, 0, 500, 60);
      expect(frames).toBe(30); // 500ms at 60 FPS
    });

    it("handles combined time components", () => {
      const frames = FramesService.convertTimeToFrames(1, 30, 45, 500, 60);
      expect(frames).toBe(326730); // 1h 30min 45s 500ms at 60 FPS
    });

    it("rounds to nearest frame", () => {
      const frames = FramesService.convertTimeToFrames(0, 0, 0, 16, 60);
      expect(frames).toBe(1); // 16ms at 60 FPS rounds to 1 frame
    });
  });

  describe("convertFramesToTime", () => {
    it("is defined", () => {
      expect(FramesService.convertFramesToTime).toBeDefined();
    });

    it("converts frames to time at 60 FPS", () => {
      const time = FramesService.convertFramesToTime(3600, 60);
      expect(time).toEqual({
        hours: 0,
        minutes: 1,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("converts frames to time at 30 FPS", () => {
      const time = FramesService.convertFramesToTime(1800, 30);
      expect(time).toEqual({
        hours: 0,
        minutes: 1,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("handles large frame counts", () => {
      const time = FramesService.convertFramesToTime(216000, 60);
      expect(time).toEqual({
        hours: 1,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
    });

    it("calculates milliseconds correctly", () => {
      const time = FramesService.convertFramesToTime(61, 60);
      expect(time).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 1,
        milliseconds: 17, // 1/60 second ≈ 16.67ms rounds to 17
      });
    });

    it("handles complex conversions", () => {
      const time = FramesService.convertFramesToTime(326730, 60);
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
      const output = FramesService.formatOutput(1, 30, 45, 500, 60, 326730);
      expect(output).toBe(
        "**Time:** `1h 30min 45s 500ms`\n" + "**FPS:** `60`\n" + "**Frames:** `326730 (0x4fc4a)`",
      );
    });

    it("formats zero values correctly", () => {
      const output = FramesService.formatOutput(0, 0, 10, 0, 30, 300);
      expect(output).toBe(
        "**Time:** `0h 0min 10s 0ms`\n" + "**FPS:** `30`\n" + "**Frames:** `300 (0x12c)`",
      );
    });

    it("formats hex with lowercase", () => {
      const output = FramesService.formatOutput(0, 0, 4, 250, 60, 255);
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
      const output = FramesService.processInput("1h 5min 15s");
      expect(output).toBe(
        "**Time:** `1h 5min 15s 0ms`\n" + "**FPS:** `60`\n" + "**Frames:** `234900 (0x39594)`",
      );
    });

    it("processes frame input correctly", () => {
      const output = FramesService.processInput("3600");
      expect(output).toBe(
        "**Time:** `0h 1min 0s 0ms`\n" + "**FPS:** `60`\n" + "**Frames:** `3600 (0xe10)`",
      );
    });

    it("processes hex frame input correctly", () => {
      const output = FramesService.processInput("0xFF");
      expect(output).toBe(
        "**Time:** `0h 0min 4s 250ms`\n" + "**FPS:** `60`\n" + "**Frames:** `255 (0xff)`",
      );
    });

    it("processes input with custom FPS", () => {
      const output = FramesService.processInput("30s 30fps");
      expect(output).toBe(
        "**Time:** `0h 0min 30s 0ms`\n" + "**FPS:** `30`\n" + "**Frames:** `900 (0x384)`",
      );
    });

    it("returns null for invalid input", () => {
      const output = FramesService.processInput("invalid");
      expect(output).toBeNull();
    });
  });
});
