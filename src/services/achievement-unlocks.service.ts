import { buildAuthorization, getAchievementUnlocks } from "@retroachievements/api";
import { RA_WEB_API_KEY } from "../config/constants";

const api = new class {
  #sleepBase = 200;
  #failures = 0;

  async wait() {
    return new Promise<void>(
      resolve => setTimeout(() => resolve(), this.#sleepBase * Math.pow(2, this.#failures++))
    );
  }

  reset() {
    this.#failures = 0;
  }
}

export const PAGE_SIZE = 500;

export class AchievementUnlocksService {
  static async getAllAchievementUnlocks(achievementId: number): Promise<string[] | null> {
    const auth = buildAuthorization({ username: "RABot", webApiKey: RA_WEB_API_KEY });

    // retry after waiting upon recieving a 429 response, fail on any other error response
    const fetchUnlocks = async (offset: number) => {
      api.reset();
      while (true) {
        try {
          return await getAchievementUnlocks(auth, {
            achievementId,
            offset,
            count: PAGE_SIZE,
          });
        } catch (error) {
          if (error instanceof Error && error.message.search("429") != -1) {
            await api.wait();
            continue;
          } else {
            return null;
          }
        }
      }
    }

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

    return data.unlocks.map(entity => entity.user);
  }
}
