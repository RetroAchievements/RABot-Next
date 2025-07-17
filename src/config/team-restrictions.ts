// Team-specific restrictions and settings.
export const TEAM_RESTRICTIONS: Record<string, {
  categoryId?: string;
  requireCategory?: boolean;
  adminOnly?: boolean;
}> = {
  racheats: {
    categoryId: "1002686858435764346",
    requireCategory: true,
  },
};