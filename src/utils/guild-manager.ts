import type { Guild } from "discord.js";

import { MAIN_GUILD_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import { logError, logger } from "./logger";

/**
 * Checks if a guild is authorized to use this bot.
 * Only MAIN_GUILD_ID and WORKSHOP_GUILD_ID are authorized.
 */
export function isAuthorizedGuild(guildId: string): boolean {
  if (!MAIN_GUILD_ID && !WORKSHOP_GUILD_ID) {
    logger.warn("No authorized guild IDs configured - bot will operate in all guilds");

    return true;
  }

  return guildId === MAIN_GUILD_ID || guildId === WORKSHOP_GUILD_ID;
}

/**
 * Leaves an unauthorized guild with proper logging and error handling.
 */
export async function leaveUnauthorizedGuild(guild: Guild): Promise<void> {
  try {
    logger.warn(`Leaving unauthorized guild: ${guild.name} (${guild.id})`);
    await guild.leave();
    logger.info(`Successfully left unauthorized guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    logError(error, {
      event: "failed_to_leave_guild",
      guildId: guild.id,
      guildName: guild.name,
    });
  }
}

/**
 * Checks all guilds and leaves any that are not authorized.
 * This should be called on bot startup.
 * Skips guild checking in development environment.
 */
export async function checkAndLeaveUnauthorizedGuilds(guilds: Guild[]): Promise<void> {
  // Skip guild restrictions in development environment.
  if (process.env.NODE_ENV !== "production") {
    logger.info("Skipping guild restrictions in development environment");

    return;
  }

  const unauthorizedGuilds = guilds.filter((guild) => !isAuthorizedGuild(guild.id));

  if (unauthorizedGuilds.length === 0) {
    logger.info("All guilds are authorized");

    return;
  }

  logger.warn(`Found ${unauthorizedGuilds.length} unauthorized guild(s), leaving them...`);

  for (const guild of unauthorizedGuilds) {
    await leaveUnauthorizedGuild(guild);
  }
}
