import type { MessageReaction, User } from "discord.js";
import { Collection, SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../models";
import { pollService } from "../services";
import { logError } from "../utils/logger";
import { EMOJI_ALPHABET } from "../utils/poll-constants";

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

    // Build poll message
    const reactions = Object.values(EMOJI_ALPHABET).slice(0, options.length);
    let optionsText = "";

    for (let i = 0; i < options.length; i++) {
      optionsText += `\n${reactions[i]} ${options[i]}`;
    }

    const pollMsg = [
      `__*${interaction.user} started a poll*__:`,
      `\n:bar_chart: **${question}**\n${optionsText}`,
    ];

    const milliseconds = seconds * 1000;

    if (milliseconds > 0) {
      pollMsg.push(
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      );
    }

    // Send the poll message
    const sentMsg = await interaction.editReply(pollMsg.join("\n"));

    if (milliseconds > 0) {
      const endTime = new Date(Date.now() + milliseconds);

      // Use Discord timestamp formatting for local time display
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      pollMsg.push(`:stopwatch: *This poll ends <t:${endTimestamp}:F>*`);
      await interaction.editReply(pollMsg.join("\n"));
    }

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      const emoji = reactions[i];
      if (emoji) {
        await sentMsg.react(emoji);
      }
    }

    // If no timer, just return
    if (milliseconds === 0) {
      return;
    }

    // Store poll in database
    const poll = await pollService.createPoll(
      sentMsg.id,
      interaction.channel!.id,
      interaction.user.id,
      question,
      options,
      new Date(Date.now() + milliseconds),
    );

    // Track voters and results in memory for this poll session
    const voters = new Set<string>();
    const pollResults = new Collection<string, number>();

    // Set up reaction collector
    const filter = (reaction: MessageReaction, user: User) => {
      // Ignore bot's reactions
      if (client.user?.id === user.id) {
        return false;
      }

      // Do not allow repeated votes
      if (voters.has(user.id)) {
        return false;
      }

      // Do not count invalid reactions
      if (!reaction.emoji.name || !reactions.includes(reaction.emoji.name)) {
        return false;
      }

      // Add voter and count vote
      voters.add(user.id);

      const emojiName = reaction.emoji.name!; // Safe after check above
      const optionIndex = reactions.indexOf(emojiName);
      if (optionIndex !== -1) {
        // Add vote to database
        pollService.addVote(poll.id, user.id, optionIndex);

        // Track in memory for immediate results
        const currentVotes = pollResults.get(emojiName) || 0;
        pollResults.set(emojiName, currentVotes + 1);
      }

      return true;
    };

    const collector = sentMsg.createReactionCollector({ filter, time: milliseconds });

    collector.on("end", async () => {
      try {
        // Prepare the final message
        const finalPollMsg = [
          `~~${pollMsg[0]}~~\n:no_entry: **THIS POLL IS ALREADY CLOSED** :no_entry:`,
          pollMsg[1], // Question and options
          "\n`This poll is closed.`",
          "__**RESULTS:**__\n",
        ];

        if (pollResults.size === 0) {
          finalPollMsg.push("No one voted");
        } else {
          // Sort results by vote count
          const sortedResults = [...pollResults.entries()].sort((a, b) => b[1] - a[1]);
          for (const [emoji, count] of sortedResults) {
            finalPollMsg.push(`${emoji}: ${count}`);
          }
        }

        await interaction.editReply(finalPollMsg.join("\n"));

        // Notify the poll creator
        await interaction.followUp({
          content: `**Your poll has ended.**\n**Click this link to see the results:**\n<${sentMsg.url}>`,
        });
      } catch (error) {
        logError(error, { context: "tpoll_slash_command_end" });
      }
    });
  },
};

export default tpollSlashCommand;
