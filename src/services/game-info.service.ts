import type { GameExtended } from "@retroachievements/api";
import { buildAuthorization, getGameExtended } from "@retroachievements/api";

import { RA_WEB_API_KEY } from "../config/constants";

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
   */
  static getMostRecentAchievementDate(gameInfo: GameExtended): string {
    if (!gameInfo.achievements || Object.keys(gameInfo.achievements).length === 0) {
      return "";
    }

    const dates = new Set<string>();

    for (const achievement of Object.values(gameInfo.achievements)) {
      if (achievement.dateModified) {
        // Extract just the date part (YYYY-MM-DD).
        const dateOnly = achievement.dateModified.split(" ")[0];
        if (dateOnly) {
          dates.add(dateOnly);
        }
      }
    }

    if (dates.size === 0) {
      return "";
    }

    // Find the most recent date.
    let mostRecentDate = "";
    for (const date of dates) {
      if (!mostRecentDate || new Date(date) > new Date(mostRecentDate)) {
        mostRecentDate = date;
      }
    }

    return mostRecentDate;
  }
}
