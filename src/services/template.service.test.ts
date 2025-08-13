import type { GameExtended } from "@retroachievements/api";
import { describe, expect, it } from "vitest";
import type { User } from "discord.js";

import { TemplateService } from "./template.service";

describe("Service: TemplateService", () => {
  const mockGameInfo: GameExtended = {
    // Using `as GameExtended` to avoid listing all properties
    id: 14402,
    title: "Halo 3",
    consoleName: "Xbox 360",
    genre: "First-Person Shooter",
    developer: "Bungie",
    publisher: "Microsoft Game Studios",
    released: "September 25, 2007",
    // ... additional required fields for GameExtended ...
    forumTopicId: 0,
    flags: null as any,
    imageIcon: "/Images/000001.png",
    imageTitle: "/Images/000002.png",
    imageIngame: "/Images/000003.png",
    imageBoxArt: "/Images/000004.png",
    richPresencePatch: null as any,
    achievements: {},
    claims: [],
    consoleId: 1,
    isFinal: false,
    numAchievements: 50,
    numDistinctPlayersCasual: 2,
    numDistinctPlayersHardcore: 3,
  } as GameExtended;

  describe("generateGanTemplate", () => {
    it("is defined", () => {
      // ASSERT
      expect(TemplateService.generateGanTemplate).toBeDefined();
    });

    it("generates a template with all game information provided", () => {
      // ARRANGE
      const achievementSetDate = "October 15, 2024";
      const youtubeLink = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const gameId = 14402;

      // ACT
      const template = TemplateService.generateGanTemplate(
        mockGameInfo,
        achievementSetDate,
        youtubeLink,
        gameId,
      );

      // ASSERT
      expect(template).toContain("< Halo 3 >");
      expect(template).toContain("[Xbox 360, First-Person Shooter](Bungie)< September 25, 2007 >");
      expect(template).toContain("A new set was published by @{AUTHOR_NAME} on October 15, 2024");
      expect(template).toContain(youtubeLink);
      expect(template).toContain("https://retroachievements.org/game/14402");
    });

    it("given missing game information, uses placeholders", () => {
      // ARRANGE
      const minimalGameInfo: GameExtended = {
        ...mockGameInfo,
        genre: null as any,
        developer: null as any,
        released: null as any,
      };

      // ACT
      const template = TemplateService.generateGanTemplate(minimalGameInfo, "", null, 14402);

      // ASSERT
      expect(template).toContain("< Halo 3 >");
      expect(template).toContain("[Xbox 360, {GENRE}]({DEVELOPER})< {RELEASE-DATE} >");
      expect(template).toContain("A new set was published by @{AUTHOR_NAME} on {SET-DATE}");
      expect(template).toContain("{LONGPLAY-LINK}");
    });

    it("given no youtube link, uses placeholder", () => {
      // ACT
      const template = TemplateService.generateGanTemplate(
        mockGameInfo,
        "October 15, 2024",
        null,
        14402,
      );

      // ASSERT
      expect(template).toContain("{LONGPLAY-LINK}");
      expect(template).not.toContain("youtube.com");
    });
  });

  describe("generateGan2Template", () => {
    it("is defined", () => {
      // ASSERT
      expect(TemplateService.generateGan2Template).toBeDefined();
    });

    it("generates a colorized template with all game information", () => {
      // ARRANGE
      const achievementSetDate = "October 15, 2024";
      const youtubeLink = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const gameId = 14402;
      const mockUser = "@TestUser" as unknown as User;

      // ACT
      const template = TemplateService.generateGan2Template(
        mockGameInfo,
        achievementSetDate,
        youtubeLink,
        gameId,
        mockUser,
      );

      // ASSERT
      expect(template).toContain("```ansi");
      expect(template).toContain("Title:");
      expect(template).toContain("Halo 3");
      expect(template).toContain("Console:");
      expect(template).toContain("Xbox 360");
      expect(template).toContain("Developer:");
      expect(template).toContain("Bungie");
      expect(template).toContain("Publisher:");
      expect(template).toContain("Microsoft Game Studios");
      expect(template).toContain("Genre:");
      expect(template).toContain("First-Person Shooter");
      expect(template).toContain("Released:");
      expect(template).toContain("September 25, 2007");
      expect(template).toContain("{GAME_DESCRIPTION}");
      expect(template).toContain("A new set was published by @TestUser on October 15, 2024");
      expect(template).toContain(youtubeLink);
      expect(template).toContain("https://retroachievements.org/game/14402");
    });

    it("given a game with no publisher, uses the developer as publisher", () => {
      // ARRANGE
      const gameInfoNoPublisher: GameExtended = {
        ...mockGameInfo,
        publisher: null as any,
      };
      const mockUser = "@TestUser" as unknown as User;

      // ACT
      const template = TemplateService.generateGan2Template(
        gameInfoNoPublisher,
        "October 15, 2024",
        null,
        14402,
        mockUser,
      );

      // ASSERT
      expect(template).toContain("Publisher:");
      expect(template).toContain("Bungie"); // ... should use developer ...
    });

    it("given missing game information, uses 'Unknown' defaults", () => {
      // ARRANGE
      const minimalGameInfo: GameExtended = {
        ...mockGameInfo,
        genre: null as any,
        developer: null as any,
        publisher: null as any,
        released: null as any,
      };
      const mockUser = "@TestUser" as unknown as User;

      // ACT
      const template = TemplateService.generateGan2Template(
        minimalGameInfo,
        "",
        null,
        14402,
        mockUser,
      );

      // ASSERT
      expect(template).toContain("Developer:");
      expect(template).toContain("Unknown");
      expect(template).toContain("Publisher:");
      expect(template).toContain("Unknown");
      expect(template).toContain("Genre:");
      expect(template).toContain("Unknown");
      expect(template).toContain("Released:");
      expect(template).toContain("Unknown");
      expect(template).toContain("{SET-DATE}");
      expect(template).toContain("{LONGPLAY-LINK}");
    });

    it("includes ANSI color codes in the output", () => {
      // ARRANGE
      const mockUser = "@TestUser" as unknown as User;

      // ACT
      const template = TemplateService.generateGan2Template(
        mockGameInfo,
        "October 15, 2024",
        null,
        14402,
        mockUser,
      );

      // ASSERT
      // ... check for ANSI escape sequences ...
      expect(template).toContain("\u001b[1;31m"); // ... red for title ...
      expect(template).toContain("\u001b[0;34m"); // ... blue for console ...
      expect(template).toContain("\u001b[0;32m"); // ... green for developer ...
      expect(template).toContain("\u001b[0;36m"); // ... cyan for publisher ...
      expect(template).toContain("\u001b[0;35m"); // ... purple for genre ...
      expect(template).toContain("\u001b[0;33m"); // ... yellow for released ...
      expect(template).toContain("\u001b[0m"); // ... reset ...
    });

    it("properly aligns labels in the table format", () => {
      // ARRANGE
      const mockUser = "@TestUser" as unknown as User;

      // ACT
      const template = TemplateService.generateGan2Template(
        mockGameInfo,
        "October 15, 2024",
        null,
        14402,
        mockUser,
      );

      // ASSERT
      // ... all labels should be padded to the same length ...
      const lines = template.split("\n");
      const tableLines = lines.slice(1, 7); // ... get the table lines ...

      // ... check that all labels have consistent spacing ...
      for (const line of tableLines) {
        // ... each line should have a label followed by spaces before the value ...
        expect(line).toMatch(/^(Title:|Console:|Developer:|Publisher:|Genre:|Released:)\s+/);
      }
    });
  });
});
