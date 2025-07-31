import {
  ChannelType,
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ThreadChannel,
} from "discord.js";

import { UWC_VOTING_TAG_ID, WORKSHOP_GUILD_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { UwcPollService } from "../services/uwc-poll.service";
import { requireGuild } from "../utils/guild-restrictions";
import { logError, logger } from "../utils/logger";

const UWC_ROLE_ID = "1002687198757388299";

const uwcSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("uwc").setDescription("Create an Unwelcome Concept poll"),

  async execute(interaction, _client) {
    /**
     * Guild restriction for security and moderation.
     *
     * UWC polls are part of the RetroAchievements Workshop process and should
     * only be available in the official Workshop Discord server where proper
     * oversight and context can be maintained.
     */
    if (!(await requireGuild(interaction, WORKSHOP_GUILD_ID))) {
      return;
    }

    // Check if user has permission (specific role or administrator).
    const member = interaction.member;
    if (!member) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    const hasRequiredRole = (member as GuildMember)?.roles?.cache?.has(UWC_ROLE_ID) ?? false;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!hasRequiredRole && !isAdmin) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // Create the poll.
    const pollReply = await interaction.reply({
      poll: {
        question: {
          text: "Is this an Unwelcome Concept?",
        },
        answers: [
          { text: "No, leave as is" },
          { text: "No, but can be improved by change to achievement" },
          { text: "Yes, demote" },
          { text: "Yes, but can be salvaged by change to achievement" },
          { text: "Need further discussion" },
        ],
        allowMultiselect: false,
        duration: 72, // 3 days in hours.
      },
      fetchReply: true,
    });

    // Extract achievement/game info from thread if available.
    let achievementId: number | undefined;
    let achievementName: string | undefined;
    let gameId: number | undefined;
    let gameName: string | undefined;

    // Try to extract context from thread name or first message.
    if (interaction.channel && interaction.channel.type === ChannelType.PublicThread) {
      const thread = interaction.channel as ThreadChannel;

      // Extract achievement ID from thread name if it follows a pattern like "243323: Title (Game)".
      const achievementIdMatch = thread.name.match(/^(\d+):/);
      if (achievementIdMatch && achievementIdMatch[1]) {
        achievementId = parseInt(achievementIdMatch[1], 10);
      }

      // Extract achievement name and game from pattern "ID: Achievement Title (Game Name)".
      // Use reverse search to handle cases where achievement or game names contain parentheses.
      const afterId = thread.name.substring(thread.name.indexOf(":") + 1).trim();
      const lastCloseParen = afterId.lastIndexOf(")");

      if (lastCloseParen !== -1) {
        // Find the matching opening paren for the last closing paren.
        let openParenIndex = -1;
        let parenDepth = 1;
        for (let i = lastCloseParen - 1; i >= 0; i--) {
          if (afterId[i] === ")") parenDepth++;
          if (afterId[i] === "(") parenDepth--;
          if (parenDepth === 0) {
            openParenIndex = i;
            break;
          }
        }

        if (openParenIndex !== -1) {
          achievementName = afterId.substring(0, openParenIndex).trim();
          gameName = afterId.substring(openParenIndex + 1, lastCloseParen).trim();
        }
      }
    }

    // Store the poll in the database.
    try {
      await UwcPollService.createUwcPoll({
        messageId: pollReply.id,
        channelId: interaction.channelId,
        threadId:
          interaction.channel?.type === ChannelType.PublicThread
            ? interaction.channel.id
            : undefined,
        creatorId: interaction.user.id,
        achievementId,
        achievementName,
        gameId,
        gameName,
        pollUrl: `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${pollReply.id}`,
      });

      logger.info("Created UWC poll", {
        messageId: pollReply.id,
        channelId: interaction.channelId,
        threadId: interaction.channel?.id,
        achievementId,
      });
    } catch (error) {
      logError(error, {
        event: "uwc_poll_create_error",
        messageId: pollReply.id,
        channelId: interaction.channelId,
      });
    }

    // Apply voting tag if in a forum thread.
    if (
      interaction.channel &&
      interaction.channel.type === ChannelType.PublicThread &&
      UWC_VOTING_TAG_ID
    ) {
      try {
        const thread = interaction.channel as ThreadChannel;
        const currentTags = thread.appliedTags || [];

        // Only add the tag if it's not already applied.
        if (!currentTags.includes(UWC_VOTING_TAG_ID)) {
          await thread.setAppliedTags([...currentTags, UWC_VOTING_TAG_ID]);
          logger.info("Applied voting tag to thread", {
            threadId: thread.id,
            tagId: UWC_VOTING_TAG_ID,
          });
        }
      } catch (error) {
        logError(error, {
          event: "uwc_tag_apply_error",
          threadId: interaction.channel.id,
          tagId: UWC_VOTING_TAG_ID,
        });
      }
    }
  },
};

export default uwcSlashCommand;
