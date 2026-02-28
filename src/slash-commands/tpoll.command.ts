import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { PollService } from "../services/poll.service";
import {
  addPollReactions,
  buildPollMessageLines,
  getReactionsForOptions,
  startTimedPollCollector,
} from "../utils/build-poll-message";

const tpollSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tpoll")
    .setDescription("Create a timed poll that automatically closes")
    .addIntegerOption(
      (option) =>
        option
          .setName("seconds")
          .setDescription("Duration in seconds (0-604800)")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(604800), // 1 week
    )
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The poll question")
        .setRequired(true)
        .setMaxLength(200),
    )
    .addStringOption((option) =>
      option.setName("option1").setDescription("First option").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("option2").setDescription("Second option").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("option3").setDescription("Third option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option4").setDescription("Fourth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option5").setDescription("Fifth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option6").setDescription("Sixth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option7").setDescription("Seventh option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option8").setDescription("Eighth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option9").setDescription("Ninth option").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("option10").setDescription("Tenth option").setRequired(false),
    ),

  legacyName: "tpoll", // For migration mapping

  async execute(interaction, client) {
    await interaction.deferReply();

    const seconds = interaction.options.getInteger("seconds", true);
    const question = interaction.options.getString("question", true);

    // Collect all options
    const options: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) {
        options.push(option);
      }
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options);
    if (uniqueOptions.size !== options.length) {
      await interaction.editReply("Poll error: duplicate options found!");

      return;
    }

    const pollMsgLines = buildPollMessageLines({
      authorMention: String(interaction.user),
      question,
      options,
    });

    const milliseconds = seconds * 1000;

    if (milliseconds > 0) {
      pollMsgLines.push(
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      );
    }

    // Send the poll message
    const sentMsg = await interaction.editReply(pollMsgLines.join("\n"));

    if (milliseconds > 0) {
      const endTime = new Date(Date.now() + milliseconds);

      // Use Discord timestamp formatting for local time display
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      pollMsgLines.push(`:stopwatch: *This poll ends <t:${endTimestamp}:F>*`);
      await interaction.editReply(pollMsgLines.join("\n"));
    }

    const reactions = getReactionsForOptions(options);
    await addPollReactions(sentMsg, reactions);

    // If no timer, just return
    if (milliseconds === 0) {
      return;
    }

    // Store poll in database
    const poll = await PollService.createPoll(
      sentMsg.id,
      interaction.channel!.id,
      interaction.user.id,
      question,
      options,
      new Date(Date.now() + milliseconds),
    );

    startTimedPollCollector({
      sentMsg,
      pollMsgLines,
      client,
      reactions,
      milliseconds,
      pollId: poll.id,
      onEnd: async (finalText) => {
        await interaction.editReply(finalText);

        await interaction.followUp({
          content: `**Your poll has ended.**\n**Click this link to see the results:**\n<${sentMsg.url}>`,
        });
      },
    });
  },
};

export default tpollSlashCommand;
