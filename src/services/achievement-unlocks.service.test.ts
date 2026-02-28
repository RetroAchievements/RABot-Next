import { beforeEach, describe, expect, it, test, vi } from "vitest";

import { createMockAchievementUnlocks } from "../test/mocks/achievement-unlocks.mock";
import { AchievementUnlocksService, PAGE_SIZE } from "./achievement-unlocks.service";

const { mockBuildAuthorization, mockGetAchievementUnlocks } = vi.hoisted(() => ({
  mockBuildAuthorization: vi.fn(() => ({ username: "RABot", webApiKey: "test-key" })),
  mockGetAchievementUnlocks: vi.fn(),
}));

vi.mock("@retroachievements/api", () => ({
  buildAuthorization: mockBuildAuthorization,
  getAchievementUnlocks: mockGetAchievementUnlocks,
}));

describe("Service: AchievementUnlocksService", () => {
  beforeEach(() => {
    mockBuildAuthorization.mockClear();
    mockGetAchievementUnlocks
      .mockClear()
      .mockImplementation(async (_auth: any, { achievementId, offset, count }: any) => {
        if (achievementId === 99999) {
          throw new Error("API Error: 404");
        }

        const data = createMockAchievementUnlocks(achievementId);
        data.unlocks = data.unlocks.slice(offset, offset + count);

        return data;
      });
  });

  describe("getAllAchievementUnlocks", () => {
    it("is defined", () => {
      // ASSERT
      expect(AchievementUnlocksService.getAllAchievementUnlocks).toBeDefined();
    });

    test.each([PAGE_SIZE - 200, PAGE_SIZE, PAGE_SIZE * 2 - 200, PAGE_SIZE * 2, PAGE_SIZE * 20])(
      "fetches all achievement unlocks successfully, %p unlocks",
      async (n) => {
        // ACT
        const result = await AchievementUnlocksService.getAllAchievementUnlocks(n);

        // ASSERT
        expect(result).toHaveLength(n);
        expect(result!.at(0)).toBe("User0");
        expect(result!.at(-1)).toBe(`User${n - 1}`);
        expect(mockGetAchievementUnlocks).toHaveBeenCalledTimes(Math.ceil(n / PAGE_SIZE));
        if (n < PAGE_SIZE) {
          expect(mockGetAchievementUnlocks).toHaveBeenCalledWith(
            { username: "RABot", webApiKey: "test-key" },
            { achievementId: n, count: PAGE_SIZE, offset: 0 },
          );
        }
      },
    );

    it("returns an empty array if there are no unlocks", async () => {
      // ACT
      const result = await AchievementUnlocksService.getAllAchievementUnlocks(0);

      // ASSERT
      expect(result).toHaveLength(0);
    });

    it("returns null if the achievement is not found", async () => {
      // ACT
      const result = await AchievementUnlocksService.getAllAchievementUnlocks(99999);

      // ASSERT
      expect(result).toBeNull();
    });

    it('handles "429 too many requests" responses gracefully', async () => {
      // ARRANGE
      mockGetAchievementUnlocks.mockRejectedValueOnce(new Error("429"));

      // ACT
      const result = await AchievementUnlocksService.getAllAchievementUnlocks(1);

      // ASSERT
      expect(result).toHaveLength(1);
      expect(mockGetAchievementUnlocks).toHaveBeenCalledTimes(2);
    });

    it("returns null on any thrown error", async () => {
      // ARRANGE
      mockGetAchievementUnlocks.mockRejectedValueOnce(new Error("500"));

      // ACT
      const result = await AchievementUnlocksService.getAllAchievementUnlocks(1);

      // ASSERT
      expect(result).toBeNull();
    });
  });
});
