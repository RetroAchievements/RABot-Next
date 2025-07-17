import type { Command } from "../models";

const one = "**1.** Don't be a jerk or generally obnoxious - nobody likes trolls.";
const two =
  "**2.** Don't use our website or Discord server to share copyrighted material or information about where they can be downloaded.";
const three =
  "**3.** Keep the Discord channels and forum threads on-topic (we do have a section for off-topic chatting, though).";
const four = "**4.** When a moderator/admin asks you to stop, you should stop.";
const five = "**5.** When in doubt, ask a @mod";

const coc = "**Complete Version**: <https://docs.retroachievements.org/Users-Code-of-Conduct/>";

const rules: Record<string, string> = {
  1: one,
  2: two,
  3: three,
  4: four,
  5: five,
  coc,

  all: `__**RULES**__\n**Simple Version**:\n${one}\n${two}\n${three}\n${four}\n${five}\n\n${coc}`,
};

const ruleCommand: Command = {
  name: "rules",
  aliases: ["rule", "rule1", "rule2", "rule3", "rule4", "rule5", "rulecoc"],
  description: "Show the rules (or a specific one)",
  usage: "!rules [number|coc]",
  examples: [
    "!rules - Show all rules",
    "!rule 2 - Show rule #2",
    "!rule2 - Show rule #2 (shorthand)",
    "!rule coc - Show Code of Conduct link",
  ],
  category: "utility",

  async execute(message, args) {
    // Check if command was invoked with a numbered alias (e.g., !rule2).
    const commandUsed = message.content.split(" ")[0]?.slice(1) || ""; // Remove prefix.
    let ruleNumber: string;

    if (commandUsed.startsWith("rule") && commandUsed.length > 4) {
      // Extract number from alias like "rule2" or "rulecoc".
      ruleNumber = commandUsed.slice(4);
    } else {
      // Use the first argument or default to "all".
      ruleNumber = args[0]?.toLowerCase() || "all";
    }

    let response = rules[ruleNumber];

    if (!response) {
      response = `**invalid rule**: ${ruleNumber}\n\n${rules.all}`;
    }

    await message.reply(response);
  },
};

export default ruleCommand;
