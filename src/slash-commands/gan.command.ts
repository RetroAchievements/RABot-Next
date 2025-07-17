import { buildAuthorization, getGameExtended } from "@retroachievements/api";
import { SlashCommandBuilder } from "discord.js";
import ytSearch from "youtube-search";

import { RA_WEB_API_KEY, YOUTUBE_API_KEY } from "../config/constants";
import type { SlashCommand } from "../models";

const ganSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gan")
    .setDescription("Generate an achievement-news post template for a game")
    .addStringOption((option) =>
      option
        .setName("game-id")
        .setDescription("Game ID number (e.g. 14402) or RetroAchievements game URL")
        .setRequired(true),
    ),

  legacyName: "gan", // For migration mapping - using the most common alias

  async execute(interaction, _client) {
    await interaction.deferReply();

    const gameInput = interaction.options.getString("game-id", true);

    // Extract game ID from argument (could be number or URL).
    let gameId: number;

    if (/^\d+$/.test(gameInput)) {
      gameId = parseInt(gameInput, 10);
    } else if (/^https?:\/\/retroachievements\.org\/game\/(\d+)/i.test(gameInput)) {
      const match = gameInput.match(/\/game\/(\d+)/);
      if (!match) {
        await interaction.editReply("Invalid game URL format.");

        return;
      }
      gameId = parseInt(match[1]!, 10);
    } else {
      await interaction.editReply(
        "Invalid game ID or URL format. Please provide a game ID number or a RetroAchievements game URL.",
      );

      return;
    }

    try {
      // Build authorization for API call.
      const authorization = buildAuthorization({
        username: "RABot",
        webApiKey: RA_WEB_API_KEY,
      });

      // Fetch game info.
      const gameInfo = await getGameExtended(authorization, { gameId });

      if (!gameInfo) {
        await interaction.editReply(
          `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
        );

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
          console.error("Error searching YouTube:", error);
          // Keep default placeholder if search fails.
        }
      }

      // Build the template.
      const template = `\`\`\`md
< ${gameInfo.title} >
[${gameInfo.consoleName}, ${gameInfo.genre || "{GENRE}"}](${gameInfo.developer || "{DEVELOPER}"})< ${gameInfo.released || "{RELEASE-DATE}"} >
\`\`\`
A new set was published by @{AUTHOR_NAME} on ${achievementSetDate || "{SET-DATE}"}
${youtubeLink}
<https://retroachievements.org/game/${gameId}>`;

      await interaction.editReply({
        content: `Here's your achievement-news post template:\n${template}`,
      });
    } catch (error) {
      console.error("Error in gan slash command:", error);
      await interaction.editReply(
        `Unable to get info from the game ID \`${gameId}\`... :frowning:`,
      );
    }
  },
};

export default ganSlashCommand;
