import { logApiCall, logError } from "../utils/logger";

export class GithubReleaseService {
  private static cachedVersion: string | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 60 * 1000; // 60 seconds in milliseconds

  /**
   * Fetch the latest release version from GitHub API.
   * Returns the version tag if successful, null otherwise.
   * Caches the result for 60 seconds to avoid rate limits.
   */
  static async fetchLatestVersion(): Promise<string | null> {
    // Check if we have a valid cached version
    const now = Date.now();
    if (this.cachedVersion && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedVersion;
    }

    const apiUrl = "https://api.github.com/repos/RetroAchievements/RABot-Next/releases/latest";
    const startTime = Date.now();

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "RABot Discord Bot (https://github.com/RetroAchievements/RABot-Next)",
        },
      });

      const duration = Date.now() - startTime;
      logApiCall("github", apiUrl, duration, response.status);

      if (!response.ok) {
        logError(
          new Error(`Failed to fetch GitHub release: ${response.status} ${response.statusText}`),
          {
            status: response.status,
            statusText: response.statusText,
          },
        );

        return null;
      }

      const data = (await response.json()) as { tag_name?: string };
      const version = data.tag_name || null;

      // Cache the successful result
      if (version) {
        this.cachedVersion = version;
        this.cacheTimestamp = now;
      }

      return version;
    } catch (error) {
      logError(error, { context: "github_release_service" });

      return null;
    }
  }
}
