import type { ChatInputCommandInteraction, Guild, Role } from "discord.js";
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";

import { GAMBLER_ROLE_ID } from "../config/constants";
import type { SlashCommand } from "../models";
import { AchievementUnlocksService } from "../services/achievement-unlocks.service";

const eventsSlashCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("Various commands for Events Team")
    .addSubcommandGroup((group) =>
      group
        .setName("gambler")
        .setDescription("Commands to manage the Gambler role")
        .addSubcommand((sub) =>
          sub.setName("reset").setDescription("Remove Gambler role from all users"),
        )
        .addSubcommand((sub) =>
          sub
            .setName("award")
            .setDescription("Manually award the Gambler role to the given user")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to add the Gambler role to")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("award-all")
            .setDescription(
              "Award Gambler role to all users that have earned at least 3 of the given achievements",
            )
            .addNumberOption((option) =>
              option.setName("ach1").setDescription("Achievement #1").setRequired(true),
            )
            .addNumberOption((option) =>
              option.setName("ach2").setDescription("Achievement #2").setRequired(true),
            )
            .addNumberOption((option) =>
              option.setName("ach3").setDescription("Achievement #3").setRequired(true),
            )
            .addNumberOption((option) =>
              option.setName("ach4").setDescription("Achievement #4").setRequired(false),
            ),
        ),
    ),

  cooldown: 3, // 3 seconds cooldown.

  async execute(interaction, _client) {
    await interaction.deferReply();

    if (!interaction.guild) {
      await interaction.editReply("This command is only supported in a server context.");

      return;
    }

    switch (interaction.options.getSubcommandGroup(true)) {
      case "gambler":
        await new GamblerCommand(interaction).run(interaction.options.getSubcommand(true));

        return;
      default:
        await interaction.editReply("Unknown subcommmand group.");

        return;
    }
  },
};

async function replyWithLog(
  interaction: ChatInputCommandInteraction,
  message: string,
  log: string,
) {
  if (log.length === 0) {
    return interaction.editReply(message);
  }
  const attachment = new AttachmentBuilder(Buffer.from(log, "utf8"), { name: "log.txt" });

  return interaction.editReply({
    content: message,
    files: [attachment],
  });
}

class GamblerCommand {
  interaction: ChatInputCommandInteraction;

  constructor(interaction: ChatInputCommandInteraction) {
    this.interaction = interaction;
  }

  async run(subcommand: string) {
    const guild = this.interaction.guild!;
    const role = await guild.roles.fetch(GAMBLER_ROLE_ID);
    if (!role) {
      await this.interaction.editReply(
        "Sorry, I couldn't fetch the Gambler role. Please contact an admin.",
      );

      return;
    }

    switch (subcommand) {
      case "reset":
        await this.resetGamblers(role);

        return;
      case "award":
        await this.awardGambler(guild, role);

        return;
      case "award-all":
        await this.awardAllGamblers(guild, role);

        return;
      default:
        await this.interaction.editReply(`Unknown subcommmand \`${subcommand}\`.`);

        return;
    }
  }

  async resetGamblers(role: Role) {
    const members = role.members.values().toArray();
    const removed = [];
    for (const member of members) {
      await member.roles.remove(role);
      removed.push(member.nickname ?? member.displayName);
    }

    await replyWithLog(
      this.interaction,
      `Removed Gambler role from ${removed.length} user(s).`,
      removed.join("\n"),
    );
  }

  async awardGambler(guild: Guild, role: Role) {
    const user = this.interaction.options.getUser("user", true);
    const member = await guild.members.fetch(user);
    await member.roles.add(role);
    await this.interaction.editReply({
      content: `Successfully awarded the Gambler role to <@${member.id}>`,
      allowedMentions: { parse: [] },
    });
  }

  async awardAllGamblers(guild: Guild, role: Role) {
    const achievements = [
      this.interaction.options.getNumber("ach1", true),
      this.interaction.options.getNumber("ach2", true),
      this.interaction.options.getNumber("ach3", true),
    ];

    const ach4 = this.interaction.options.getNumber("ach4", false);
    if (ach4) {
      achievements.push(ach4);
    }

    const scores = new Map();
    let statusMessage = "";

    for (const id of achievements) {
      const unlocks = await AchievementUnlocksService.getAllAchievementUnlocks(id);
      if (!unlocks) {
        await this.interaction.editReply(
          "Sorry, I couldn't fetch the achievement unlocks right now. Please check achievement IDs and try again in a minute.",
        );

        return;
      }

      statusMessage += `Fetched ${unlocks.length} unlocks from achievement ID ${id}...\n`;
      await this.interaction.editReply(statusMessage);

      for (const user of unlocks) {
        scores.set(user, (scores.get(user) ?? 0) + 1);
      }
    }

    const gamblers = scores
      .entries()
      .filter((pair) => pair[1] >= 3)
      .map((pair) => pair[0]);

    const members = new Map(
      (await guild.members.fetch())
        .values()
        .map((member) => [member.nickname ?? member.displayName, member]),
    );

    const added = [];
    const skipped = [];

    for (const user of gamblers) {
      if (members.has(user)) {
        await members.get(user)!.roles.add(role);
        added.push(user);
      } else {
        skipped.push(user);
      }
    }

    added.sort();
    skipped.sort();

    await replyWithLog(
      this.interaction,
      `${statusMessage}\nAdded the Gambler role to ${added.length} members, skipped ${skipped.length} users not found on the server.`,
      `Added:\n${added.map((s) => `  ${s}`).join("\n")}\nSkipped:\n${skipped.map((s) => `  ${s}`).join("\n")}`,
    );
  }
}

export default eventsSlashCommand;
