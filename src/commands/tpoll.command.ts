import type { MessageReaction, User } from "discord.js";
import { Collection } from "discord.js";

import type { Command } from "../models";
import { PollService } from "../services/poll.service";

const EMOJI_ALPHABET: Record<string, string> = {
  a: "🇦",
  b: "🇧",
  c: "🇨",
  d: "🇩",
  e: "🇪",
  f: "🇫",
  g: "🇬",
  h: "🇭",
  i: "🇮",
  j: "🇯",
  k: "🇰",
  l: "🇱",
  m: "🇲",
  n: "🇳",
  o: "🇴",
  p: "🇵",
  q: "🇶",
  r: "🇷",
  s: "🇸",
  t: "🇹",
  u: "🇺",
  v: "🇻",
  w: "🇼",
  x: "🇽",
  y: "🇾",
  z: "🇿",
};

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

    // Build poll message.
    const reactions = Object.values(EMOJI_ALPHABET).slice(0, opts.length);
    let options = "";

    for (let i = 0; i < opts.length; i++) {
      options += `\n${reactions[i]} ${opts[i]}`;
    }

    const pollMsg = [
      `__*${message.author} started a poll*__:`,
      `\n:bar_chart: **${question}**\n${options}`,
    ];

    const milliseconds = seconds * 1000;

    if (milliseconds > 0) {
      pollMsg.push(
        "\n`Notes:\n- only the first reaction is considered a vote\n- unlisted reactions void the vote`",
      );
    }

    // Send the poll message.
    if (!("send" in message.channel)) {
      await message.reply("This command can only be used in text channels.");

      return;
    }

    const sentMsg = await message.channel.send(pollMsg.join("\n"));

    if (milliseconds > 0) {
      const endTime = new Date(sentMsg.createdTimestamp);
      endTime.setTime(endTime.getTime() + milliseconds);

      // Use Discord timestamp formatting for local time display
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      pollMsg.push(`:stopwatch: *This poll ends <t:${endTimestamp}:F>*`);
      await sentMsg.edit(pollMsg.join("\n"));
    }

    // Add reactions.
    for (let i = 0; i < opts.length; i++) {
      const emoji = reactions[i];
      if (emoji) {
        await sentMsg.react(emoji);
      }
    }

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

    // Track voters and results in memory for this poll session.
    const voters = new Set<string>();
    const pollResults = new Collection<string, number>();

    // Set up reaction collector.
    const filter = (reaction: MessageReaction, user: User) => {
      // Ignore bot's reactions.
      if (client.user?.id === user.id) {
        return false;
      }

      // Do not allow repeated votes.
      if (voters.has(user.id)) {
        return false;
      }

      // Do not count invalid reactions.
      if (!reaction.emoji.name || !reactions.includes(reaction.emoji.name)) {
        return false;
      }

      // Add voter and count vote.
      voters.add(user.id);

      const emojiName = reaction.emoji.name!; // Safe after check above
      const optionIndex = reactions.indexOf(emojiName);
      if (optionIndex !== -1) {
        // Add vote to database.
        PollService.addVote(poll.id, user.id, optionIndex);

        // Track in memory for immediate results.
        const currentVotes = pollResults.get(emojiName) || 0;
        pollResults.set(emojiName, currentVotes + 1);
      }

      return true;
    };

    const collector = sentMsg.createReactionCollector({ filter, time: milliseconds });

    collector.on("end", async () => {
      try {
        // Prepare the final message.
        const finalPollMsg = [
          `~~${pollMsg[0]}~~\n:no_entry: **THIS POLL IS ALREADY CLOSED** :no_entry:`,
          pollMsg[1], // Question and options.
          "\n`This poll is closed.`",
          "__**RESULTS:**__\n",
        ];

        if (pollResults.size === 0) {
          finalPollMsg.push("No one voted");
        } else {
          // Sort results by vote count.
          const sortedResults = [...pollResults.entries()].sort((a, b) => b[1] - a[1]);
          for (const [emoji, count] of sortedResults) {
            finalPollMsg.push(`${emoji}: ${count}`);
          }
        }

        await sentMsg.edit(finalPollMsg.join("\n"));

        // Notify the poll creator.
        const pollEndedMsg = [
          "**Your poll has ended.**",
          "**Click this link to see the results:**",
          `<${sentMsg.url}>`,
        ];

        await message.reply(pollEndedMsg.join("\n"));
      } catch (error) {
        console.error("Error ending timed poll:", error);
        await message.reply("**`poll` error**: Something went wrong with your poll.");
      }
    });
  },
};

export default tpollCommand;
