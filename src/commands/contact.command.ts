import { EmbedBuilder } from "discord.js";

import { COLORS } from "../config/constants";
import type { Command } from "../models";

const contactCommand: Command = {
  name: "contact",
  aliases: ["contactus", "contact-us"],
  description: "How to contact the RetroAchievements staff",
  usage: "!contact",
  category: "utility",

  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle("Contact Us")
      .setDescription(
        "If you would like to contact us, please send a site message to the appropriate team below.",
      )
      .addFields([
        {
          name: ":e_mail: Admins and Moderators",
          value: `[Send a message to RAdmin](https://retroachievements.org/createmessage.php?t=RAdmin)
                 - Reporting offensive behavior.
                 - Reporting copyrighted material.
                 - Requesting to be untracked.`,
        },
        {
          name: ":e_mail: Developer Compliance",
          value: `[Send a message to Developer Compliance](https://retroachievements.org/createmessage.php?t=DevCompliance)
                 - Requesting set approval or early set release.
                 - Reporting achievements or sets with unwelcome concepts.
                 - Reporting sets failing to cover basic progression.`,
        },
        {
          name: ":e_mail: Quality Assurance",
          value: `[Send a message to Quality Assurance](https://retroachievements.org/createmessage.php?t=QATeam)
                 - Reporting a broken set, leaderboard, or rich presence.
                 - Reporting achievements with grammatical mistakes.
                 - Requesting a set be playtested.
                 - Hash compatibility questions.
                 - Hub organizational questions.
                 - Getting involved in a QA sub-team.`,
        },
        {
          name: ":e_mail: RAArtTeam",
          value: `[Send a message to RAArtTeam](https://retroachievements.org/messages/create?to=RAArtTeam)
                 - Icon Gauntlets and how to start one.
                 - Proposing art updates.
                 - Questions about art-related rule changes.
                 - Requests for help with creating a new badge or badge set.`,
        },
        {
          name: ":e_mail: WritingTeam",
          value: `[Send a message to WritingTeam](https://retroachievements.org/messages/create?to=WritingTeam)
                 - Reporting achievements with grammatical mistakes.
                 - Reporting achievements with unclear or confusing descriptions.
                 - Requesting help from the team with proofreading achievement sets.
                 - Requesting help for coming up with original titles for achievements.`,
        },
        {
          name: ":e_mail: RANews",
          value: `[Send a message to RANews](https://retroachievements.org/createmessage.php?t=RANews)
                 - Submitting a Play This Set, Wish This Set, or RAdvantage entry.
                 - Submitting a retrogaming article.
                 - Proposing a new article idea.
                 - Getting involved with RANews.`,
        },
        {
          name: ":e_mail: RAEvents",
          value: `[Send a message to RAEvents](https://retroachievements.org/createmessage.php?t=RAEvents)
                 - Submissions, questions, ideas, or reporting issues related to events.`,
        },
        {
          name: ":e_mail: DevQuest",
          value: `[Send a message to DevQuest](https://retroachievements.org/createmessage.php?t=DevQuest)
                 - Submissions, questions, ideas, or reporting issues related to DevQuest.`,
        },
        {
          name: ":e_mail: RACheats",
          value: `[Send a message to RACheats](https://retroachievements.org/createmessage.php?t=RACheats)
                 - If you believe someone is in violation of our [Global Leaderboard and Achievement Hunting Rules](https://docs.retroachievements.org/guidelines/users/global-leaderboard-and-achievement-hunting-rules.html#not-allowed).`,
        },
      ]);

    try {
      await message.react("📧");
      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({ embeds: [embed] });
    }
  },
};

export default contactCommand;
