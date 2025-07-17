export const COMMAND_PREFIX = process.env.COMMAND_PREFIX || "!";
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
export const RA_WEB_API_KEY = process.env.RA_WEB_API_KEY || "";
export const RA_CONNECT_API_KEY = process.env.RA_CONNECT_API_KEY || "";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

// RetroAchievements Workshop server config.
export const CHEAT_INVESTIGATION_CATEGORY_ID = "1002686858435764346";

// Poll configuration.
export const MAX_POLL_OPTIONS = 10;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_DURATION = 604800; // 1 week in seconds.

// Rate limiting.
export const COMMAND_COOLDOWN_MS = 3000; // 3 seconds.

// Colors for embeds.
export const COLORS = {
  PRIMARY: 0x0099ff,
  SUCCESS: 0x00ff00,
  ERROR: 0xff0000,
  WARNING: 0xffff00,
  INFO: 0x0099ff,
} as const;