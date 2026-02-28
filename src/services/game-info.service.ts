import type { GameExtended } from "@retroachievements/api";
import { buildAuthorization, getGameExtended } from "@retroachievements/api";

import { RA_WEB_API_KEY } from "../config/constants";

/**
 * Service for fetching and processing RetroAchievements game data.
 *
 * Uses the official @retroachievements/api package for type safety and
 * consistent API interaction patterns. The service handles both direct
 * game ID inputs and URL extraction for user convenience in Discord commands.
 */
export class GameInfoService {
  /**
   * Extract a game ID from a string input which could be a numeric ID or a RetroAchievements URL.
   */
  static extractGameId(input: string): number | null {
    // Check if it's a numeric ID.
    if (/^\d+$/.test(input)) {
      return parseInt(input, 10);
    }

    // Check if it's a RetroAchievements URL.
    if (/^https?:\/\/retroachievements\.org\/game\/(\d+)/i.test(input)) {
      const match = input.match(/\/game\/(\d+)/);
      if (match) {
        return parseInt(match[1]!, 10);
      }
    }

    return null;
  }

  /**
   * Fetch extended game information from the RetroAchievements API.
   */
  static async fetchGameInfo(gameId: number): Promise<GameExtended | null> {
    const authorization = buildAuthorization({
      username: "RABot",
      webApiKey: RA_WEB_API_KEY,
    });

    const gameInfo = await getGameExtended(authorization, { gameId });

    return gameInfo || null;
  }

  /**
   * Get the most recent achievement modification date from game info.
   *
   * This date is used in Discord embeds to show when a game's achievement set
   * was last updated. We only extract the date portion to avoid
   * timezone complexity in Discord displays.
   */
  static getMostRecentAchievementDate(gameInfo: GameExtended): string {
    if (!gameInfo.achievements || Object.keys(gameInfo.achievements).length === 0) {
      return "";
    }

    let mostRecentDate = "";

    for (const achievement of Object.values(gameInfo.achievements)) {
      if (achievement.dateModified) {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone display issues.
        const dateOnly = achievement.dateModified.split(" ")[0];
        if (dateOnly && (!mostRecentDate || new Date(dateOnly) > new Date(mostRecentDate))) {
          mostRecentDate = dateOnly;
        }
      }
    }

    return mostRecentDate;
  }
}
