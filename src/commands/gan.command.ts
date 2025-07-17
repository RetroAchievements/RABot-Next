import { buildAuthorization, getGameExtended } from "@retroachievements/api";
import ytSearch from "youtube-search";

import { RA_WEB_API_KEY, YOUTUBE_API_KEY } from "../config/constants";
import type { Command } from "../models";
import { logError } from "../utils/logger";

const ganCommand: Command = {
  name: "genachnews",
  aliases: ["gan"],
  description: "Generate an achievement-news post template for the given game ID",
  usage: "!gan <gameId|gameUrl>",
  examples: ["!gan 4650", "!gan https://retroachievements.org/game/4650"],
  category: "retroachievements",
  cooldown: 3, // 3 seconds default cooldown.

  async execute(message, args) {
    if (!args[0]) {
      await message.reply("Please provide a game ID or URL. Example: `!gan 4650`");

      return;
    }

    // Extract game ID from argument (could be number or URL).
    let gameId: number;
    const arg = args[0];

    if (/^\d+$/.test(arg)) {
      gameId = parseInt(arg, 10);
    } else if (/^https?:\/\/retroachievements\.org\/game\/(\d+)/i.test(arg)) {
      const match = arg.match(/\/game\/(\d+)/);
      if (!match) {
        await message.reply("Invalid game URL format.");

        return;
      }
      gameId = parseInt(match[1]!, 10);
    } else {
      await message.reply("Invalid game ID or URL format.");

      return;
    }

    const sentMsg = await message.reply(
      `:hourglass: Getting info for game ID \`${gameId}\`, please wait...`,
    );

    try {
      // Build authorization for API call.
      const authorization = buildAuthorization({
        username: "RABot",
        webApiKey: RA_WEB_API_KEY,
      });

      // Fetch game info.
      const gameInfo = await getGameExtended(authorization, { gameId });

      if (!gameInfo) {
        await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);

        return;
      }

      // Find the most recent achievement modification date.
      let achievementSetDate = "";
      if (gameInfo.achievements && Object.keys(gameInfo.achievements).length > 0) {
        const dates = new Set<string>();

        for (const achievement of Object.values(gameInfo.achievements)) {
          if (achievement.dateModified) {
            // Extract just the date part (YYYY-MM-DD).
            const dateOnly = achievement.dateModified.split(" ")[0];
            if (dateOnly) {
              dates.add(dateOnly);
            }
          }
        }

        // Find the most recent date.
        let mostRecentDate = "";
        for (const date of dates) {
          if (!mostRecentDate || new Date(date) > new Date(mostRecentDate)) {
            mostRecentDate = date;
          }
        }
        achievementSetDate = mostRecentDate;
      }

      // Try to find a YouTube longplay link.
      let youtubeLink = "{LONGPLAY-LINK}";
      if (YOUTUBE_API_KEY) {
        try {
          const searchTerms = `longplay ${gameInfo.title.replace(/~/g, "")} ${gameInfo.consoleName}`;
          const opts = {
            maxResults: 1,
            key: YOUTUBE_API_KEY,
          };

          const { results } = await ytSearch(searchTerms, opts);

          if (results && results.length > 0 && results[0]?.link) {
            youtubeLink = results[0].link;
          }
        } catch (error) {
          logError("Error searching YouTube:", { error });
          // Keep default placeholder if search fails.
        }
      }

      // Build the template.
      const template = `
\\\`\\\`\\\`md
\`\`\`md
< ${gameInfo.title} >
[${gameInfo.consoleName}, ${gameInfo.genre || "{GENRE}"}](${gameInfo.developer || "{DEVELOPER}"})< ${gameInfo.released || "{RELEASE-DATE}"} >
\`\`\`\\\`\\\`\\\`
A new set was published by @{AUTHOR_NAME} on ${achievementSetDate || "{SET-DATE}"}
${youtubeLink}
<https://retroachievements.org/game/${gameId}>
`;

      await sentMsg.edit(
        `${message.author}, here's your achievement-news post template:\n${template}`,
      );
    } catch (error) {
      logError("Error in gan command:", { error });
      await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
    }
  },
};

export default ganCommand;
