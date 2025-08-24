import { logApiCall, logError } from "../utils/logger";

export class DadjokeService {
  /**
   * Fetch a random dad joke from the icanhazdadjoke.com API.
   * Returns the joke text if successful, null otherwise.
   */
  static async fetchRandomJoke(): Promise<string | null> {
    const apiUrl = "https://icanhazdadjoke.com/";
    const startTime = Date.now();

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "RABot Discord Bot (https://github.com/RetroAchievements/RABot)",
        },
      });

      const duration = Date.now() - startTime;
      logApiCall("icanhazdadjoke", apiUrl, duration, response.status);

      if (!response.ok) {
        logError(new Error(`Failed to fetch dad joke: ${response.status} ${response.statusText}`), {
          status: response.status,
          statusText: response.statusText,
        });

        return null;
      }

      const data = (await response.json()) as { joke?: string };

      return data.joke || null;
    } catch (error) {
      logError(error, { context: "dadjoke_service" });

      return null;
    }
  }
}
