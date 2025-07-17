import type { Command } from "../models";

const EMOJI_ALPHABET: Record<string, string> = {
  a: "🇦", b: "🇧", c: "🇨", d: "🇩", e: "🇪", f: "🇫", g: "🇬", h: "🇭",
  i: "🇮", j: "🇯", k: "🇰", l: "🇱", m: "🇲", n: "🇳", o: "🇴", p: "🇵",
  q: "🇶", r: "🇷", s: "🇸", t: "🇹", u: "🇺", v: "🇻", w: "🇼", x: "🇽",
  y: "🇾", z: "🇿"
};

const pollCommand: Command = {
  name: "poll",
  description: "Create a (useless) poll",
  usage: "!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'",
  examples: ["!poll 'Which option you choose?' 'option one' 'option 2' 'option N'"],
  category: "utility",
  
  async execute(message, args, client) {
    // Parse arguments - they should be in quotes.
    const quotedArgs = message.content.match(/'[^']*'|"[^"]*"/g);
    
    if (!quotedArgs || quotedArgs.length < 3) {
      await message.reply("Usage: `!poll 'Question?' 'Option 1' 'Option 2' ... 'Option N'`\nYou need at least a question and 2 options.");
      return;
    }

    // Remove quotes from arguments.
    const cleanArgs = quotedArgs.map(arg => arg.slice(1, -1));
    const question = cleanArgs[0];
    const opts = cleanArgs.slice(1);

    if (!question || question.length === 0 || question.length >= 400) {
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
      `\n:bar_chart: **${question}**\n${options}`
    ];

    // Send the poll message.
    if (!("send" in message.channel)) {
      await message.reply("This command can only be used in text channels.");
      return;
    }
    
    const sentMsg = await message.channel.send(pollMsg.join("\n"));

    // Add reactions.
    for (let i = 0; i < opts.length; i++) {
      const emoji = reactions[i];
      if (emoji) {
        await sentMsg.react(emoji);
      }
    }
  },
};

export default pollCommand;