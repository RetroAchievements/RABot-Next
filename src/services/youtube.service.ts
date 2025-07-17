import ytSearch from "youtube-search";

import { YOUTUBE_API_KEY } from "../config/constants";
import { logError } from "../utils/logger";

export class YouTubeService {
  /**
   * Search for a longplay video on YouTube for a given game.
   * Returns the video URL if found, null otherwise.
   */
  static async searchLongplay(gameTitle: string, consoleName: string): Promise<string | null> {
    if (!YOUTUBE_API_KEY) {
      return null;
    }

    try {
      // Clean up the game title by removing special characters like ~.
      const cleanTitle = gameTitle.replace(/~/g, "");
      const searchTerms = `longplay ${cleanTitle} ${consoleName}`;

      const opts = {
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      };

      const { results } = await ytSearch(searchTerms, opts);

      if (results && results.length > 0 && results[0]?.link) {
        return results[0].link;
      }

      return null;
    } catch (error) {
      logError("Error searching YouTube:", { error });

      return null;
    }
  }
}
