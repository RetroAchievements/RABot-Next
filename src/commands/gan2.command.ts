import { buildAuthorization, getGameExtended } from "@retroachievements/api";
import ytSearch from "youtube-search";

import { RA_WEB_API_KEY, YOUTUBE_API_KEY } from "../config/constants";
import type { Command } from "../models";

const gan2Command: Command = {
  name: "gan2",
  description: "Generate a pretty achievement-news post for the given game ID",
  usage: "!gan2 <gameId|gameUrl>",
  examples: ["!gan2 4650", "!gan2 https://retroachievements.org/game/4650"],
  category: "retroachievements",

  async execute(message, args) {
    if (!args[0]) {
      await message.reply("Please provide a game ID or URL. Example: `!gan2 4650`");

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
        if (dates.size > 0) {
          let mostRecentDate = "";
          for (const date of dates) {
            if (!mostRecentDate || new Date(date) > new Date(mostRecentDate)) {
              mostRecentDate = date;
            }
          }
          achievementSetDate = mostRecentDate;
        }
      }

      // Try to find a YouTube longplay link.
      let youtubeLink = "";
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
          console.error("Error searching YouTube:", error);
        }
      }

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

      // Add role ping if specified (you can make this configurable).
      // output += "@Achievement-News\n";

      // Add the ANSI formatted table in a code block.
      output += "```ansi\n" + formattedTable + "\n```\n";

      // Add game description placeholder.
      output += "{GAME_DESCRIPTION}\n\n";

      // Add the achievement set info - use the person who ran the command.
      output += `A new set was published by ${message.author} on ${achievementSetDate || "{SET-DATE}"}\n`;

      // Add YouTube link if found.
      if (youtubeLink) {
        output += `${youtubeLink}\n`;
      } else {
        output += "{LONGPLAY-LINK}\n";
      }

      // Add game link.
      output += `https://retroachievements.org/game/${gameId}`;

      // Delete the loading message and send the formatted output.
      await sentMsg.delete();

      if ("send" in message.channel) {
        await message.channel.send(output);
      }
    } catch (error) {
      console.error("Error in gan2 command:", error);
      await sentMsg.edit(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
    }
  },
};

export default gan2Command;
