export const LEGACY_COMMAND_PREFIX = process.env.LEGACY_COMMAND_PREFIX || "!";
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
export const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || "";
export const RA_WEB_API_KEY = process.env.RA_WEB_API_KEY || "";
export const RA_CONNECT_API_KEY = process.env.RA_CONNECT_API_KEY || "";
export const RA_CONNECT_API_USER = process.env.RA_CONNECT_API_USER || "RABot";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

// RetroAchievements Workshop server config.
export const CHEAT_INVESTIGATION_CATEGORY_ID = process.env.CHEAT_INVESTIGATION_CATEGORY_ID || "";

// Guild restrictions.
export const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || "";
export const WORKSHOP_GUILD_ID = process.env.WORKSHOP_GUILD_ID || "";

// UWC Poll configuration.
export const UWC_VOTING_TAG_ID = process.env.UWC_VOTING_TAG_ID || "";
export const UWC_VOTE_CONCLUDED_TAG_ID = process.env.UWC_VOTE_CONCLUDED_TAG_ID || "";

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
