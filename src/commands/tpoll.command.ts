import type { Command } from "../models";
import { PollService } from "../services/poll.service";
import {
  addPollReactions,
  buildPollMessageLines,
  getReactionsForOptions,
  startTimedPollCollector,
} from "../utils/build-poll-message";

const tpollCommand: Command = {
  name: "tpoll",
  description: "Create a timed poll",
  usage: "!tpoll <seconds> 'Question?' 'Option 1' 'Option 2' ... 'Option N'",
  examples: ["!tpoll 60 'Which option you choose?' 'option one' 'option 2' 'option N'"],
  category: "utility",

  async execute(message, args, client) {
    // Parse the command - first arg should be seconds, rest should be quoted strings.
    const fullContent = message.content.substring(message.content.indexOf(" ") + 1);

    // Extract the seconds argument.
    const firstSpaceIndex = fullContent.indexOf(" ");
    if (firstSpaceIndex === -1) {
      await message.reply(
        "Usage: `!tpoll <seconds> 'Question?' 'Option 1' 'Option 2' ... 'Option N'`",
      );

      return;
    }

    const secondsStr = fullContent.substring(0, firstSpaceIndex);
    const remainingContent = fullContent.substring(firstSpaceIndex + 1);

    const seconds = parseInt(secondsStr, 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 604800) {
      // Max 1 week.
      await message.reply("Please provide a valid number of seconds (0-604800).");

      return;
    }

    // Parse quoted arguments.
    const quotedArgs = remainingContent.match(/'[^']*'|"[^"]*"/g);

    if (!quotedArgs || quotedArgs.length < 3) {
      await message.reply(
        "Usage: `!tpoll <seconds> 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.",
      );

      return;
    }

    // Remove quotes from arguments.
    const cleanArgs = quotedArgs.map((arg) => arg.slice(1, -1));
    const question = cleanArgs[0];
    const opts = cleanArgs.slice(1);

    if (!question || question.length === 0 || question.length >= 200) {
      await message.reply("Invalid question");

      return;
    }

    if (opts.length < 2 || opts.length > 10) {
      await message.reply("The number of options must be greater than 2 and less than 10");

      return;
    }

    // Check for duplicate options.
    const uniqueOpts = new Set(opts);
    if (uniqueOpts.size !== opts.length) {
      const duplicates = opts.filter((opt, index) => opts.indexOf(opt) !== index);
      await message.reply(`**\`poll\` error**: repeated options found: \`${duplicates[0]}\``);

      return;
    }

    const pollMsgLines = buildPollMessageLines({
      authorMention: String(message.author),
      question,
      options: opts,
    });

    const milliseconds = seconds * 1000;

    if (milliseconds > 0) {
      pollMsgLines.push(
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      );
    }

    // Send the poll message.
    if (!("send" in message.channel)) {
      await message.reply("This command can only be used in text channels.");

      return;
    }

    const sentMsg = await message.channel.send(pollMsgLines.join("\n"));

    if (milliseconds > 0) {
      const endTime = new Date(sentMsg.createdTimestamp);
      endTime.setTime(endTime.getTime() + milliseconds);

      // Use Discord timestamp formatting for local time display
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      pollMsgLines.push(`:stopwatch: *This poll ends <t:${endTimestamp}:F>*`);
      await sentMsg.edit(pollMsgLines.join("\n"));
    }

    const reactions = getReactionsForOptions(opts);
    await addPollReactions(sentMsg, reactions);

    // If no timer, just return.
    if (milliseconds === 0) {
      return;
    }

    // Store poll in database.
    const endTime = new Date(Date.now() + milliseconds);
    const poll = await PollService.createPoll(
      sentMsg.id,
      message.channel.id,
      message.author.id,
      question || "",
      opts,
      endTime,
    );

    startTimedPollCollector({
      sentMsg,
      pollMsgLines,
      client,
      reactions,
      milliseconds,
      pollId: poll.id,
      onEnd: async (finalText) => {
        await sentMsg.edit(finalText);

        const pollEndedMsg = [
          "**Your poll has ended.**",
          "**Click this link to see the results:**",
          `<${sentMsg.url}>`,
        ];

        await message.reply(pollEndedMsg.join("\n"));
      },
    });
  },
};

export default tpollCommand;
