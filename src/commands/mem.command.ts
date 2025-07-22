import { buildAuthorization, getAchievementUnlocks } from "@retroachievements/api";
import { EmbedBuilder } from "discord.js";

import { COLORS, RA_WEB_API_KEY } from "../config/constants";
import type { Command } from "../models";
import { connectApiService } from "../services/connect-api.service";
import { logCommandExecution, logError } from "../utils/logger";
import { formatMemoryGroups, parseMemory } from "../utils/memory-parser";

const memCommand: Command = {
  name: "parsemem",
  aliases: ["mem"],
  description: "Parse a MemAddr string and show the respective logic.",
  usage: "!mem <achievementId|achievementUrl|memAddr>",
  examples: [
    "!mem 123456",
    "!mem https://retroachievements.org/achievement/123456",
    "!mem R:0xH00175b=73_0xH0081f9=0S0xH00b241=164.40.",
  ],
  category: "retroachievements",
  cooldown: 3,

  async execute(message, args) {
    logCommandExecution("mem", message.author.id, message.guildId || undefined, message.channelId);

    if (!args[0]) {
      await message.reply("Please provide an achievement ID, URL, or MemAddr string.");

      return;
    }

    const input = args.join(" ");

    // Check if it's an achievement URL or ID.
    const achievementUrlRegex =
      /^<?(https?:\/\/)?retroachievements\.org\/achievement\/([0-9]+)>?$/i;
    const urlMatch = input.match(achievementUrlRegex);
    const achievementId = urlMatch ? parseInt(urlMatch[2] || "", 10) : parseInt(args[0] || "", 10);

    if (!isNaN(achievementId) && achievementId > 0) {
      // Handle achievement ID/URL.
      const sentMsg = await message.reply(
        `:hourglass: Getting MemAddr for achievement ID **${achievementId}**, please wait...`,
      );

      try {
        // First, get the game ID for this achievement.
        const authorization = buildAuthorization({ username: "RABot", webApiKey: RA_WEB_API_KEY });
        const achievementData = await getAchievementUnlocks(authorization, {
          achievementId,
        });

        const gameId = achievementData?.game?.id;

        if (!gameId) {
          await sentMsg.edit(
            `**Whoops!**\nI didn't find the game ID for achievement ID **${achievementId}**.`,
          );

          return;
        }

        // Get the MemAddr for this achievement.
        const memAddr = await connectApiService.getMemAddr(gameId, achievementId);
        if (!memAddr) {
          await sentMsg.edit(
            `**Whoops!**\nI didn't find the MemAddr for achievement ID **${achievementId}**.`,
          );

          return;
        }

        // Parse the MemAddr.
        const parsed = parseMemory(memAddr);
        const formatted = formatMemoryGroups(parsed.groups);

        // Check if we should include code notes (dev channels only).
        const devChannels = process.env.DEV_CHANNELS?.split(",") || [];
        const isDevChannel = devChannels.includes(message.channelId);

        if (isDevChannel && parsed.addresses.length > 0) {
          const codeNotes = await connectApiService.getCodeNotes(gameId);
          const embed = createCodeNotesEmbed(gameId, parsed.addresses, codeNotes);

          if (embed) {
            await sentMsg.edit({ content: formatted, embeds: [embed] });
          } else {
            await sentMsg.edit(formatted);
          }
        } else {
          await sentMsg.edit(formatted);
        }
      } catch (error) {
        logError(error, { command: "mem", achievementId });
        await sentMsg.edit(`**Whoops!**\nFailed to fetch achievement data.`);
      }
    } else {
      // Try to parse as MemAddr string.
      try {
        const parsed = parseMemory(input);
        const formatted = formatMemoryGroups(parsed.groups);
        await message.reply(formatted);
      } catch (error) {
        await message.reply(
          `**Whoops!**\n${error instanceof Error ? error.message : "Invalid MemAddr string"}\nCheck your MemAddr string and try again.`,
        );
      }
    }
  },
};

function createCodeNotesEmbed(
  gameId: number,
  addresses: string[],
  codeNotes: Array<{ Address: string; Note: string }>,
): EmbedBuilder | null {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("Code Notes")
    .setURL(`https://retroachievements.org/codenotes.php?g=${gameId}`);

  let hasNote = false;
  let fieldCount = 0;
  const maxFields = 10; // ... limit to prevent embed overflow ...

  for (const addr of addresses) {
    if (fieldCount >= maxFields) break;

    const note = codeNotes.find((n) => n.Address === addr);
    if (note) {
      hasNote = true;

      // ... check if note starts with a standard formatted title ...
      let noteText = note.Note;
      let fieldName = `📍 ${addr}`;

      // ... extract title if it starts with square brackets (can be on its own line) ...
      const titleMatch = noteText.match(/^\[.*?\].*$/m);
      if (titleMatch) {
        const title = titleMatch[0].trim();
        fieldName = `📍 ${addr} **${title}**`;
        // ... remove the title line from the note text ...
        noteText = noteText.replace(titleMatch[0], "").replace(/^\n+/, "").trim();
      }

      // ... truncate remaining note text ...
      if (noteText.length > 400) {
        noteText = noteText.substring(0, 400) + "...";
      }

      embed.addFields({
        name: fieldName,
        value: noteText ? `\`\`\`${noteText}\`\`\`` : "*No additional details*",
        inline: false, // ... display each note on its own line ...
      });

      fieldCount++;
    }
  }

  // ... add footer if we hit the limit ...
  if (fieldCount >= maxFields && addresses.length > maxFields) {
    embed.setFooter({
      text: `Showing first ${maxFields} code notes. View all notes on the website.`,
    });
  }

  return hasNote ? embed : null;
}

export default memCommand;
