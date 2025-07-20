import {
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { WORKSHOP_GUILD_ID } from "../config/constants";
import { UWC_POLL_ANSWERS, UWC_POLL_DURATION_HOURS, UWC_ROLE_ID } from "../constants/uwc.constants";
import type { SlashCommand } from "../models";
import { type UwcPoll, UwcPollFetcherService } from "../services/uwc-poll-fetcher.service";
import { UwcPollFormatterService } from "../services/uwc-poll-formatter.service";
import { requireGuild } from "../utils/guild-restrictions";

const uwcSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("uwc")
    .setDescription("Unwelcome Concept poll management")
    .addSubcommand((subcommand) =>
      subcommand.setName("create").setDescription("Create an Unwelcome Concept poll"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all active Unwelcome Concept polls"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Search for previous UWC results by achievement ID or game ID")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Achievement ID or Game ID to search for")
            .setRequired(true),
        ),
    ),

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

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "create": {
        await handleCreateSubcommand(interaction);
        break;
      }

      case "list": {
        await handleListSubcommand(interaction);
        break;
      }

      case "search": {
        await handleSearchSubcommand(interaction);
        break;
      }
    }
  },
};

async function handleCreateSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    poll: {
      question: {
        text: "Is this an Unwelcome Concept?",
      },
      answers: UWC_POLL_ANSWERS,
      allowMultiselect: false,
      duration: UWC_POLL_DURATION_HOURS,
    },
  });
}

async function handleListSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Defer the reply as this might take a moment
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.guild) {
    await interaction.editReply({
      content: "This command can only be used in a server.",
    });

    return;
  }

  // Fetch all UWC polls
  const { activePolls, endedPollsAwaitingAction } = await UwcPollFetcherService.fetchAllPolls(
    interaction.guild,
    interaction.client.user!,
  );

  if (activePolls.length === 0 && endedPollsAwaitingAction.length === 0) {
    await interaction.editReply({
      content: "No UWC polls found in this server.",
    });

    return;
  }

  // Process voting status and vote counts for active polls
  await processActivePolls(activePolls, interaction.user.id);

  // Separate voted and unvoted polls
  const unvotedPolls = activePolls.filter((p) => !p.hasVoted);
  const votedPolls = activePolls.filter((p) => p.hasVoted);

  // Sort each group by time remaining (most urgent first)
  const sortByExpiry = (a: UwcPoll, b: UwcPoll) => {
    const aExpires = a.message.poll?.expiresAt?.getTime() || 0;
    const bExpires = b.message.poll?.expiresAt?.getTime() || 0;

    return aExpires - bExpires;
  };

  unvotedPolls.sort(sortByExpiry);
  votedPolls.sort(sortByExpiry);

  // Fetch vote counts for ended polls
  await processEndedPolls(endedPollsAwaitingAction);

  // Sort ended polls by when they ended (most recent first)
  endedPollsAwaitingAction.sort((a, b) => {
    const aExpires = a.message.poll?.expiresAt?.getTime() || 0;
    const bExpires = b.message.poll?.expiresAt?.getTime() || 0;

    return bExpires - aExpires;
  });

  // Format the response
  const response = UwcPollFormatterService.formatListResponse(
    unvotedPolls,
    votedPolls,
    endedPollsAwaitingAction,
  );

  await interaction.editReply({
    content: response,
  });
}

async function handleSearchSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString("query", true);

  // Defer the reply as this will take a moment
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.guild) {
    await interaction.editReply({
      content: "This command can only be used in a server.",
    });

    return;
  }

  // Search for matching polls
  const matchingPolls = await UwcPollFetcherService.searchPolls(
    interaction.guild,
    interaction.client.user!,
    query,
  );

  if (matchingPolls.length === 0) {
    await interaction.editReply({
      content: `No UWC polls found containing "${query}" in the channel/thread name.`,
    });

    return;
  }

  // Fetch vote counts for all matching polls
  for (const poll of matchingPolls) {
    poll.voteCounts = await UwcPollFetcherService.fetchVoteCounts(poll.message.poll);
  }

  // Format the response
  const response = UwcPollFormatterService.formatSearchResponse(matchingPolls, query);

  await interaction.editReply({
    content: response,
  });
}

async function processActivePolls(polls: UwcPoll[], userId: string): Promise<void> {
  for (const pollEntry of polls) {
    try {
      const poll = pollEntry.message.poll!;

      // Check if user has voted
      pollEntry.hasVoted = await UwcPollFetcherService.hasUserVoted(poll, userId);

      // Fetch vote counts
      pollEntry.voteCounts = await UwcPollFetcherService.fetchVoteCounts(poll);

      // Calculate leading option
      pollEntry.leadingOption = UwcPollFormatterService.getLeadingOption(pollEntry.voteCounts);
    } catch (_error) {
      // If there's any error, assume not voted
      pollEntry.hasVoted = false;
      pollEntry.voteCounts = [];
      pollEntry.leadingOption = null;
    }
  }
}

async function processEndedPolls(polls: UwcPoll[]): Promise<void> {
  for (const pollEntry of polls) {
    try {
      pollEntry.voteCounts = await UwcPollFetcherService.fetchVoteCounts(pollEntry.message.poll);
    } catch (_error) {
      pollEntry.voteCounts = [];
    }
  }
}

export default uwcSlashCommand;
