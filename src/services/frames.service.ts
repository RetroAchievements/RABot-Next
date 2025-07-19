export interface ParsedInput {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  frames?: number;
  fps: number;
}

export interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export class FramesService {
  private static readonly DEFAULT_FPS = 60;

  /**
   * Parse user input to extract time, frames, and FPS values.
   */
  static parseInput(input: string): ParsedInput | null {
    // Regex patterns
    const timeRegex = /(([0-9.]+) *h)? *(([0-9.]+) *min)? *(([0-9.]+) *s)? *(([0-9]+) *ms)?/i;
    const fpsRegex = /([0-9]+) *fps/i;
    const framesRegex = /^ *([0-9]+ *fps )? *((0x)?[a-f0-9]+) *( [0-9]+ *fps)? *$/i;

    // Extract FPS (default to 60)
    const fpsMatch = input.match(fpsRegex);
    const fps = fpsMatch?.[1] ? parseInt(fpsMatch[1], 10) : this.DEFAULT_FPS;

    // Try to parse as time format
    const timeMatch = input.match(timeRegex);
    const hours = parseFloat(timeMatch?.[2] || "0");
    const minutes = parseFloat(timeMatch?.[4] || "0");
    const seconds = parseFloat(timeMatch?.[6] || "0");
    const milliseconds = parseFloat(timeMatch?.[8] || "0");

    const totalSeconds = seconds + milliseconds / 1000 + minutes * 60 + hours * 60 * 60;

    if (totalSeconds > 0 && fps > 0) {
      return {
        hours,
        minutes,
        seconds,
        milliseconds,
        fps,
      };
    }

    // Try to parse as frames format
    const framesMatch = input.match(framesRegex);
    if (framesMatch?.[2]) {
      const radix = framesMatch[2].toLowerCase().startsWith("0x") ? 16 : 10;
      const frames = parseInt(framesMatch[2], radix);

      if (frames > 0 && fps > 0 && !isNaN(frames)) {
        return {
          frames,
          fps,
        };
      }
    }

    return null;
  }

  /**
   * Convert time components to frames at the specified FPS.
   */
  static convertTimeToFrames(
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number,
    fps: number,
  ): number {
    const totalSeconds = seconds + milliseconds / 1000 + minutes * 60 + hours * 60 * 60;

    return Math.round(fps * totalSeconds);
  }

  /**
   * Convert frames to time components at the specified FPS.
   */
  static convertFramesToTime(frames: number, fps: number): TimeComponents {
    const totalSeconds = frames / fps;

    // Extract milliseconds from fractional seconds
    const milliseconds = Math.round(1000 * (totalSeconds - Math.floor(totalSeconds)));
    const wholeSeconds = Math.floor(totalSeconds);

    // Calculate time components
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds - hours * 3600) / 60);
    const seconds = wholeSeconds - hours * 3600 - minutes * 60;

    return {
      hours,
      minutes,
      seconds,
      milliseconds,
    };
  }

  /**
   * Format the output message with time, FPS, and frame information.
   */
  static formatOutput(
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number,
    fps: number,
    frames: number,
  ): string {
    return (
      `**Time:** \`${hours}h ${minutes}min ${seconds}s ${milliseconds}ms\`\n` +
      `**FPS:** \`${fps}\`\n` +
      `**Frames:** \`${frames} (0x${frames.toString(16)})\``
    );
  }

  /**
   * Process the user input and return the formatted conversion result.
   */
  static processInput(input: string): string | null {
    const parsed = this.parseInput(input);
    if (!parsed) {
      return null;
    }

    let hours: number;
    let minutes: number;
    let seconds: number;
    let milliseconds: number;
    let frames: number;

    if (parsed.frames !== undefined) {
      // Convert frames to time
      const time = this.convertFramesToTime(parsed.frames, parsed.fps);
      hours = time.hours;
      minutes = time.minutes;
      seconds = time.seconds;
      milliseconds = time.milliseconds;
      frames = parsed.frames;
    } else {
      // Convert time to frames
      hours = parsed.hours || 0;
      minutes = parsed.minutes || 0;
      seconds = parsed.seconds || 0;
      milliseconds = parsed.milliseconds || 0;
      frames = this.convertTimeToFrames(hours, minutes, seconds, milliseconds, parsed.fps);
    }

    return this.formatOutput(hours, minutes, seconds, milliseconds, parsed.fps, frames);
  }
}
