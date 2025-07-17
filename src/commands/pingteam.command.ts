import { PermissionFlagsBits } from "discord.js";

import { TEAM_RESTRICTIONS } from "../config/team-restrictions";
import type { Command } from "../models";
import { TeamService } from "../services/team.service";

const pingteamCommand: Command = {
  name: "pingteam",
  description: "Ping a team of users",
  usage: "!pingteam <team> [add|remove|list] [@user]",
  examples: [
    "!pingteam racheats - Ping the RACheats team",
    "!pingteam racheats add @user - Add user to team (admin only)",
    "!pingteam racheats remove @user - Remove user from team (admin only)",
    "!pingteam racheats list - List team members",
  ],
  category: "moderation",
  cooldown: 30, // 30 seconds cooldown for team pings.

  async execute(message, args) {
    if (args.length === 0) {
      await message.reply("Please specify a team name. Example: `!pingteam racheats`");

      return;
    }

    const teamId = args[0]!.toLowerCase();
    const subcommand = args[1]?.toLowerCase();

    // Get or create the team.
    let team = await TeamService.getTeam(teamId);
    if (!team) {
      // Auto-create teams on first use.
      const teamName = teamId.charAt(0).toUpperCase() + teamId.slice(1);
      team = await TeamService.createTeam(teamId, `${teamName} Team`, message.author.id);
    }

    // Handle subcommands.
    if (subcommand === "add" || subcommand === "remove") {
      // Check admin permissions.
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply("You need administrator permissions to manage teams.");

        return;
      }

      const user = message.mentions.users.first();
      if (!user) {
        await message.reply("Please mention a user to add/remove.");

        return;
      }

      if (subcommand === "add") {
        await TeamService.addMember(teamId, user.id, message.author.id);
        await message.reply(`✅ Added ${user} to the ${team.name} team.`);
      } else {
        const removed = await TeamService.removeMember(teamId, user.id);
        if (removed) {
          await message.reply(`✅ Removed ${user} from the ${team.name} team.`);
        } else {
          await message.reply(`${user} is not a member of the ${team.name} team.`);
        }
      }

      return;
    }

    if (subcommand === "list") {
      // Check team-specific restrictions for listing members.
      const restrictions = TEAM_RESTRICTIONS[teamId];
      if (restrictions?.requireCategory && restrictions.categoryId) {
        if (
          !("parentId" in message.channel) ||
          message.channel.parentId !== restrictions.categoryId
        ) {
          await message.reply(
            `The ${team.name} team members can only be viewed from specific channels.`,
          );

          return;
        }
      }

      const memberIds = await TeamService.getTeamMembers(teamId);
      if (memberIds.length === 0) {
        await message.reply(`The ${team.name} team has no members.`);

        return;
      }

      // Fetch user details to show usernames instead of pinging.
      const memberDetails = await Promise.all(
        memberIds.map(async (id) => {
          try {
            const user = await message.client.users.fetch(id);

            return `${user.username} (${user.id})`;
          } catch {
            return `Unknown User (${id})`;
          }
        }),
      );

      await message.reply(
        `**${team.name} team members:**\n\`\`\`\n${memberDetails.join("\n")}\n\`\`\``,
      );

      return;
    }

    // Default action: ping the team.
    // Check team-specific restrictions.
    const restrictions = TEAM_RESTRICTIONS[teamId];
    if (restrictions?.requireCategory && restrictions.categoryId) {
      // Check if channel has a parent category.
      if (
        !("parentId" in message.channel) ||
        message.channel.parentId !== restrictions.categoryId
      ) {
        await message.reply(`The ${team.name} can only be pinged from specific channels.`);

        return;
      }
    }

    const memberIds = await TeamService.getTeamMembers(teamId);
    if (memberIds.length === 0) {
      await message.reply(
        `The ${team.name} team has no members. An administrator needs to add members first.`,
      );

      return;
    }

    // Create the ping message.
    const memberPings = memberIds.map((id) => `<@${id}>`).join(" ");

    // Use reply to ensure it works in all channel types.
    await message.reply(
      `📡 **${team.name} team ping!**\n${memberPings}\n\nRequested by ${message.author}`,
    );
  },
};

export default pingteamCommand;
