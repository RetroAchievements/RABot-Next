/**
 * Centralized user-facing messages for consistency across commands.
 */

export const MESSAGES = {
  // Game ID validation and errors
  INVALID_GAME_ID: "Invalid game ID or URL format.",
  INVALID_GAME_ID_DETAILED:
    "Invalid game ID or URL format. Please provide a game ID number or a RetroAchievements game URL.",
  UNABLE_TO_GET_GAME_INFO: (gameId: string) =>
    `Unable to get info from the game ID \`${gameId}\`... :frowning:`,

  // Loading messages
  GETTING_GAME_INFO: (gameId: string) =>
    `:hourglass: Getting info for game ID \`${gameId}\`, please wait...`,
  GETTING_MEMADDR: (achievementId: string) =>
    `:hourglass: Getting MemAddr for achievement ID **${achievementId}**, please wait...`,

  // Command usage instructions
  GAN_USAGE_EXAMPLE: "Please provide a game ID or URL. Example: `!gan 4650`",

  // Success messages
  GAN_TEMPLATE_SUCCESS: (author: string, template: string) =>
    `${author}, here's your achievement-news post template:\n${template}`,
  GAN_SLASH_TEMPLATE_SUCCESS: (template: string) =>
    `Here's your achievement-news post template:\n${template}`,

  // Generic error messages
  WHOOPS_FETCH_ERROR: "**Whoops!**\nFailed to fetch achievement data.",
  POLL_ERROR: "**`poll` error**: Something went wrong with your poll.",
} as const;
