import type { GameExtended } from "@retroachievements/api";

export function createMockGameExtended(overrides?: Partial<GameExtended>): GameExtended {
  return {
    id: 14402,
    title: "Test Game",
    consoleName: "Test Console",
    consoleId: 1,
    forumTopicId: 12345,
    flags: 3,
    imageIcon: "/Images/000001.png",
    imageTitle: "/Images/000002.png",
    imageIngame: "/Images/000003.png",
    imageBoxArt: "/Images/000004.png",
    publisher: "Test Publisher",
    developer: "Test Developer",
    genre: "Action",
    released: "2023-01-01",
    isFinal: false,
    richPresencePatch: "richPresencePatch",
    numAchievements: 50,
    numDistinctPlayersHardcore: 3,
    numDistinctPlayersCasual: 2,
    achievements: {
      "1001": {
        id: 1001,
        numAwarded: 100,
        numAwardedHardcore: 50,
        title: "First Achievement",
        description: "Complete the first level",
        points: 10,
        trueRatio: 15,
        author: "TestAuthor",
        dateModified: "2023-10-15 12:00:00",
        dateCreated: "2023-10-01 10:00:00",
        badgeName: "badge_1001",
        displayOrder: 1,
        memAddr: "0x1234",
        type: null,
      },
      "1002": {
        id: 1002,
        numAwarded: 80,
        numAwardedHardcore: 40,
        title: "Second Achievement",
        description: "Collect 100 coins",
        points: 25,
        trueRatio: 40,
        author: "TestAuthor",
        dateModified: "2023-10-20 14:30:00",
        dateCreated: "2023-10-01 10:00:00",
        badgeName: "badge_1002",
        displayOrder: 2,
        memAddr: "0x5678",
        type: null,
      },
    },
    claims: [],
    ...overrides,
  };
}

export function createMockGameMinimal(): GameExtended {
  return createMockGameExtended({
    genre: undefined,
    developer: undefined,
    publisher: undefined,
    released: undefined,
    achievements: {},
  });
}
