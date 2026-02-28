import { buildAuthorization, getAchievementUnlocks } from "@retroachievements/api";

import { RA_WEB_API_KEY } from "../config/constants";

export const PAGE_SIZE = 500;

export class AchievementUnlocksService {
  static async getAllAchievementUnlocks(achievementId: number): Promise<string[] | null> {
    const auth = buildAuthorization({ username: "RABot", webApiKey: RA_WEB_API_KEY });

    // retry after waiting up to 5 times upon receiving a 429 response, fail on any other error response
    const fetchUnlocks = async (offset: number) => {
      for (let tries = 0; tries < 5; tries++) {
        try {
          return await getAchievementUnlocks(auth, {
            achievementId,
            offset,
            count: PAGE_SIZE,
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes("429")) {
            await new Promise<void>((resolve) => setTimeout(() => resolve(), Math.pow(2, tries) * 200));
            continue;
          } else {
            return null;
          }
        }
      }
    };

    const data = await fetchUnlocks(0);
    if (!data) {
      return null;
    }

    let remaining = data.unlocksCount - PAGE_SIZE;
    while (remaining > 0) {
      const next = await fetchUnlocks(data.unlocks.length);
      if (!next) {
        return null;
      }
      data.unlocks.push(...next.unlocks);
      remaining -= PAGE_SIZE;
    }

    return data.unlocks.map((entity) => entity.user);
  }
}
