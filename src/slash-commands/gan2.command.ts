import { SlashCommandBuilder } from "discord.js";
import { buildAuthorization, getGameExtended } from "@retroachievements/api";
import ytSearch from "youtube-search";
import type { SlashCommand } from "../models";
import { RA_WEB_API_KEY, YOUTUBE_API_KEY } from "../config/constants";

const gan2SlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("gan2")
    .setDescription("Generate a pretty achievement-news post with colored formatting")
    .addStringOption(option =>
      option
        .setName("game-id")
        .setDescription("Game ID number (e.g. 14402) or RetroAchievements game URL")
        .setRequired(true)
    ),
  
  legacyName: "gan2", // For migration mapping
  
  async execute(interaction, client) {
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
      await interaction.editReply("Invalid game ID or URL format. Please provide a game ID number or a RetroAchievements game URL.");
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
        await interaction.editReply(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
        return;
      }

      // Find the most recent achievement modification date.
      let achievementSetDate = "";
      
      if (gameInfo.achievements && Object.keys(gameInfo.achievements).length > 0) {
        const dates = new Set<string>();
        
        Object.values(gameInfo.achievements).forEach((achievement) => {
          if (achievement.dateModified) {
            // Extract just the date part (YYYY-MM-DD).
            const dateOnly = achievement.dateModified.split(" ")[0];
            if (dateOnly) {
              dates.add(dateOnly);
            }
          }
        });

        // Find the most recent date.
        if (dates.size > 0) {
          achievementSetDate = [...dates].reduce((d1, d2) => {
            return new Date(d1) >= new Date(d2) ? d1 : d2;
          });
        }
      }

      // Try to find a YouTube longplay link.
      let youtubeLink = "";
      if (YOUTUBE_API_KEY) {
        try {
          const searchTerms = `longplay ${gameInfo.title.replace(/~/g, '')} ${gameInfo.consoleName}`;
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
        red: `${ESC}[1;31m`,     // Title
        blue: `${ESC}[0;34m`,    // Console
        green: `${ESC}[0;32m`,   // Developer
        cyan: `${ESC}[0;36m`,    // Publisher
        purple: `${ESC}[0;35m`,  // Genre
        yellow: `${ESC}[0;33m`,  // Released
        reset: `${ESC}[0m`
      };

      // Create the formatted table with ANSI colors.
      const tableData = [
        { label: "Title:", value: gameInfo.title, color: colors.red },
        { label: "Console:", value: gameInfo.consoleName, color: colors.blue },
        { label: "Developer:", value: gameInfo.developer || "Unknown", color: colors.green },
        { label: "Publisher:", value: gameInfo.publisher || gameInfo.developer || "Unknown", color: colors.cyan },
        { label: "Genre:", value: gameInfo.genre || "Unknown", color: colors.purple },
        { label: "Released:", value: gameInfo.released || "Unknown", color: colors.yellow }
      ];

      // Build the formatted table with proper spacing.
      const maxLabelLength = Math.max(...tableData.map(row => row.label.length));
      const formattedTable = tableData.map(row => 
        `${row.label.padEnd(maxLabelLength + 5)}${row.color}${row.value}${colors.reset}`
      ).join("\n");

      // Build the message.
      let output = "";
      
      // Add the ANSI formatted table in a code block.
      output += "```ansi\n" + formattedTable + "\n```\n";
      
      // Add game description placeholder.
      output += "{GAME_DESCRIPTION}\n\n";
      
      // Add the achievement set info - use the person who ran the command.
      output += `A new set was published by ${interaction.user} on ${achievementSetDate || "{SET-DATE}"}\n`;
      
      // Add YouTube link if found.
      if (youtubeLink) {
        output += `${youtubeLink}\n`;
      } else {
        output += "{LONGPLAY-LINK}\n";
      }
      
      // Add game link.
      output += `https://retroachievements.org/game/${gameId}`;

      await interaction.editReply(output);
      
    } catch (error) {
      console.error("Error in gan2 slash command:", error);
      await interaction.editReply(`Unable to get info from the game ID \`${gameId}\`... :frowning:`);
    }
  },
};

export default gan2SlashCommand;