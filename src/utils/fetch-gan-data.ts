import type { GameExtended } from "@retroachievements/api";

import { GameInfoService } from "../services/game-info.service";
import { YouTubeService } from "../services/youtube.service";

export interface GanData {
  gameInfo: GameExtended;
  achievementSetDate: string;
  youtubeLink: string | null;
  gameId: number;
}

export const fetchGanData = async (gameId: number): Promise<GanData | null> => {
  const gameInfo = await GameInfoService.fetchGameInfo(gameId);
  if (!gameInfo) {
    return null;
  }

  const achievementSetDate = GameInfoService.getMostRecentAchievementDate(gameInfo);
  const youtubeLink = await YouTubeService.searchLongplay(gameInfo.title, gameInfo.consoleName);

  return { gameInfo, achievementSetDate, youtubeLink, gameId };
};
