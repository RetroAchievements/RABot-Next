import type { AchievementUnlocksMetadata } from "@retroachievements/api";

export function createMockAchievementUnlocks(
  unlocksCount: number,
  overrides?: Partial<AchievementUnlocksMetadata>,
): AchievementUnlocksMetadata {
  return {
    achievement: {
      id: 12345,
      title: "Test Achievement 1",
      description: "Complete a level",
      points: 5,
      trueRatio: 1,
      author: "TestAuthor",
      dateCreated: "2025-12-01 00:00:00",
      dateModified: "2025-12-02 00:00:00",
    },
    console: {
      id: 1,
      title: "Test Console",
    },
    game: {
      id: 2,
      title: "Test Game",
    },
    totalPlayers: 9999,
    unlocks: [...Array(unlocksCount)].map((_, i) => ({
      user: `User${i}`,
      raPoints: 5,
      raSoftcorePoints: 0,
      dateAwarded: "2026-01-01 02:00:00",
      hardcoreMode: true,
    })),
    unlocksCount,
    ...overrides,
  };
}
