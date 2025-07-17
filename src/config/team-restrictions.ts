import { CHEAT_INVESTIGATION_CATEGORY_ID } from "./constants";

// Team-specific restrictions and settings.
export const TEAM_RESTRICTIONS: Record<
  string,
  {
    categoryId?: string;
    requireCategory?: boolean;
    adminOnly?: boolean;
  }
> = {
  racheats: {
    categoryId: CHEAT_INVESTIGATION_CATEGORY_ID,
    requireCategory: true,
  },
};
