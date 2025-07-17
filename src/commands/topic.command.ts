import type { Command } from "../models";

const topicCommand: Command = {
  name: "topic",
  description: "Display the current channel topic",
  usage: "!topic",
  category: "utility",

  async execute(message) {
    // Check if channel supports topics (text-based channels).
    const topic = "topic" in message.channel ? message.channel.topic : null;
    const channelName = message.channel.isDMBased()
      ? `@${message.author.username}`
      : `#${message.channel.name}`;

    const response = `${channelName}'s topic:\n\`---\`\n**${topic || " "}**\n\`---\``;

    await message.reply(response);
  },
};

export default topicCommand;
