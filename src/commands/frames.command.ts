import type { Command } from "../models";
import { FramesService } from "../services/frames.service";

const framesCommand: Command = {
  name: "frames",
  description: "Converts between time and frames at different frame rates",
  usage: "!frames <time|frames> [fps]",
  category: "utility",
  examples: [
    "!frames 1h 5min 15s - info for 1 hour, 5 minutes and 15 seconds at 60 FPS (default)",
    "!frames 500ms 30fps - info for 500 milliseconds at 30 FPS",
    "!frames 123.321min 25fps - info for 123.321 minutes at 25 FPS",
    "!frames 40 - info for 40 frames at 60 FPS (default)",
    "!frames 123 30fps - info for 123 frames at 30 FPS",
    "!frames 0xFF - info for 255 frames (hex) at 60 FPS",
  ],

  async execute(message, args) {
    if (args.length === 0) {
      await message.reply(
        "Please provide a time duration or frame count. Use `!help frames` to see examples.",
      );

      return;
    }

    const input = args.join(" ");
    const result = FramesService.processInput(input);

    if (!result) {
      await message.reply(
        `Invalid time format: \`${input}\`\nUse \`!help frames\` to see some useful examples.`,
      );

      return;
    }

    await message.reply(result);
  },
};

export default framesCommand;
