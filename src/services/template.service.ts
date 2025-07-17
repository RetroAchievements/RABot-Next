import type { GameExtended } from "@retroachievements/api";
import type { User } from "discord.js";

export class TemplateService {
  /**
   * Generate the GAN (Game Achievement News) template for a game.
   */
  static generateGanTemplate(
    gameInfo: GameExtended,
    achievementSetDate: string,
    youtubeLink: string | null,
    gameId: number,
  ): string {
    const template = `\`\`\`md
< ${gameInfo.title} >
[${gameInfo.consoleName}, ${gameInfo.genre || "{GENRE}"}](${gameInfo.developer || "{DEVELOPER}"})< ${gameInfo.released || "{RELEASE-DATE}"} >
\`\`\`
A new set was published by @{AUTHOR_NAME} on ${achievementSetDate || "{SET-DATE}"}
${youtubeLink || "{LONGPLAY-LINK}"}
<https://retroachievements.org/game/${gameId}>`;

    return template;
  }

  /**
   * Generate the GAN2 (pretty formatted) template for a game.
   */
  static generateGan2Template(
    gameInfo: GameExtended,
    achievementSetDate: string,
    youtubeLink: string | null,
    gameId: number,
    user: User | string,
  ): string {
    // ANSI escape sequences - need to use actual escape character.
    const ESC = "\u001b";
    const colors = {
      red: `${ESC}[1;31m`, // Title
      blue: `${ESC}[0;34m`, // Console
      green: `${ESC}[0;32m`, // Developer
      cyan: `${ESC}[0;36m`, // Publisher
      purple: `${ESC}[0;35m`, // Genre
      yellow: `${ESC}[0;33m`, // Released
      reset: `${ESC}[0m`,
    };

    // Create the formatted table with ANSI colors.
    const tableData = [
      { label: "Title:", value: gameInfo.title, color: colors.red },
      { label: "Console:", value: gameInfo.consoleName, color: colors.blue },
      { label: "Developer:", value: gameInfo.developer || "Unknown", color: colors.green },
      {
        label: "Publisher:",
        value: gameInfo.publisher || gameInfo.developer || "Unknown",
        color: colors.cyan,
      },
      { label: "Genre:", value: gameInfo.genre || "Unknown", color: colors.purple },
      { label: "Released:", value: gameInfo.released || "Unknown", color: colors.yellow },
    ];

    // Build the formatted table with proper spacing.
    const maxLabelLength = Math.max(...tableData.map((row) => row.label.length));
    const formattedTable = tableData
      .map(
        (row) => `${row.label.padEnd(maxLabelLength + 5)}${row.color}${row.value}${colors.reset}`,
      )
      .join("\n");

    // Build the message.
    let output = "";

    // Add the ANSI formatted table in a code block.
    output += "```ansi\n" + formattedTable + "\n```\n";

    // Add game description placeholder.
    output += "{GAME_DESCRIPTION}\n\n";

    // Add the achievement set info.
    output += `A new set was published by ${user} on ${achievementSetDate || "{SET-DATE}"}\n`;

    // Add YouTube link if found.
    if (youtubeLink) {
      output += `${youtubeLink}\n`;
    } else {
      output += "{LONGPLAY-LINK}\n";
    }

    // Add game link.
    output += `https://retroachievements.org/game/${gameId}`;

    return output;
  }
}
