import type { User } from "discord.js";

import { logError } from "../utils/logger";
import { MESSAGES } from "../utils/messages";
import { GameInfoService } from "./game-info.service";
import { TemplateService } from "./template.service";
import { YouTubeService } from "./youtube.service";

export interface GanResult {
  success: boolean;
  template?: string;
  output?: unknown; // For gan2 which returns a different format
  error?: string;
}

export interface GanOptions {
  variant?: "gan" | "gan2";
  user?: User; // Required for gan2 variant
}

/**
 * Service for handling shared GAN command logic.
 */
export class GanService {
  /**
   * Process a game ID input and generate the appropriate template.
   */
  static async processGameId(
    gameInput: string,
    options: GanOptions = { variant: "gan" },
  ): Promise<GanResult> {
    const { variant = "gan", user } = options;

    // Extract game ID from argument.
    const gameId = GameInfoService.extractGameId(gameInput);
    if (!gameId) {
      return {
        success: false,
        error: MESSAGES.INVALID_GAME_ID_DETAILED,
      };
    }

    try {
      // Fetch game info.
      const gameInfo = await GameInfoService.fetchGameInfo(gameId);
      if (!gameInfo) {
        return {
          success: false,
          error: MESSAGES.UNABLE_TO_GET_GAME_INFO(gameId.toString()),
        };
      }

      // Get achievement date and YouTube link.
      const achievementSetDate = GameInfoService.getMostRecentAchievementDate(gameInfo);
      const youtubeLink = await YouTubeService.searchLongplay(gameInfo.title, gameInfo.consoleName);

      // Generate template based on variant.
      if (variant === "gan2") {
        if (!user) {
          throw new Error("User is required for gan2 variant");
        }

        const output = TemplateService.generateGan2Template(
          gameInfo,
          achievementSetDate,
          youtubeLink,
          gameId,
          user,
        );

        return {
          success: true,
          output,
        };
      }
      // Default gan variant
      const template = TemplateService.generateGanTemplate(
        gameInfo,
        achievementSetDate,
        youtubeLink,
        gameId,
      );

      return {
        success: true,
        template,
      };
    } catch (error) {
      const context = `gan_service_${variant}`;
      logError(error, { context, gameId: gameInput });

      return {
        success: false,
        error: MESSAGES.UNABLE_TO_GET_GAME_INFO(gameId?.toString() || gameInput),
      };
    }
  }
}
