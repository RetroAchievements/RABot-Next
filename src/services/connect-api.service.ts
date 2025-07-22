import { RA_CONNECT_API_KEY, RA_CONNECT_API_USER } from "../config/constants";
import { logApiCall, logError } from "../utils/logger";

const BASE_URL = "https://retroachievements.org/";

export interface PatchDataAchievement {
  ID: number;
  MemAddr: string;
  Title: string;
  Description: string;
  Points: number;
  Author: string;
  Modified: string;
  Created: string;
  BadgeName: string;
  Flags: number;
  Type: string | null;
  DisplayOrder: number;
  AssocVideo: string | null;
  Rarity: number;
  RarityHardcore: number;
  TruePoints: number;
}

export interface PatchData {
  PatchData: {
    Achievements: PatchDataAchievement[];
  };
}

export interface CodeNote {
  Address: string;
  Note: string;
  User: string;
  Created: string;
}

export interface CodeNotesResponse {
  CodeNotes: CodeNote[];
}

class ConnectApiService {
  private async makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const queryParams = new URLSearchParams({
      u: RA_CONNECT_API_USER,
      t: RA_CONNECT_API_KEY,
      ...params,
    });

    const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

    try {
      logApiCall("Connect API", endpoint, undefined, undefined, params);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data as T;
    } catch (error) {
      logError(error, { endpoint, params });
      throw error;
    }
  }

  async getPatchData(gameId: number): Promise<PatchData> {
    return this.makeRequest<PatchData>("dorequest.php", {
      r: "patch",
      g: gameId.toString(),
    });
  }

  async getMemAddr(gameId: number, achievementId: number): Promise<string | null> {
    try {
      const patchData = await this.getPatchData(gameId);
      const achievement = patchData.PatchData.Achievements.find((ach) => ach.ID === achievementId);

      return achievement?.MemAddr || null;
    } catch (error) {
      logError(error, { gameId, achievementId });

      return null;
    }
  }

  async getCodeNotes(gameId: number): Promise<CodeNote[]> {
    try {
      const response = await this.makeRequest<CodeNotesResponse>("dorequest.php", {
        r: "codenotes2",
        g: gameId.toString(),
      });

      return response.CodeNotes || [];
    } catch (error) {
      logError(error, { gameId });

      return [];
    }
  }
}

export const connectApiService = new ConnectApiService();
