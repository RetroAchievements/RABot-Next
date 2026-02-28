import type { Message } from "discord.js";

import type { BotClient } from "../models";
import { AutoPublishService } from "../services/auto-publish.service";
import { AdminChecker } from "../utils/admin-checker";
import { CommandAnalytics } from "../utils/command-analytics";
import { CooldownManager } from "../utils/cooldown-manager";
import { logCommandExecution, logError, logMigrationNotice } from "../utils/logger";
import { sendMigrationNotice } from "../utils/migration-helper";

export async function handleMessage(message: Message, client: BotClient): Promise<void> {
  if (message.author.bot) return;

  await AutoPublishService.handleMessage(message);

  const prefix = client.commandPrefix || "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases?.includes(commandName));

  if (!command) return;

  const isAdmin = AdminChecker.isAdminFromMessage(message);

  const remainingCooldown = CooldownManager.checkCooldownWithBypass(
    client.cooldowns,
    message.author.id,
    command.name,
    isAdmin,
    command.cooldown,
  );

  if (remainingCooldown > 0) {
    const cooldownMessage = CooldownManager.formatCooldownMessage(remainingCooldown);
    const reply = await message.reply(cooldownMessage);

    setTimeout(
      () =>
        reply.delete().catch((error) => {
          logError(error, {
            event: "cooldown_message_delete_error",
            userId: message.author.id,
            guildId: message.guildId,
            channelId: message.channelId,
          });
        }),
      5000,
    );

    return;
  }

  const slashCommand = client.slashCommands.find((cmd) => {
    return cmd.legacyName === commandName;
  });

  if (slashCommand && commandName !== "poll") {
    logMigrationNotice(
      commandName,
      slashCommand.data.name,
      message.author.id,
      message.guildId || undefined,
    );

    try {
      await sendMigrationNotice(message, slashCommand.data.name, {
        executeAfterNotice: true,
        deleteAfter: 15000,
        useEphemeralButton: false,
      });
    } catch (error) {
      logError(error, {
        event: "migration_notice_error",
        legacyCommand: commandName,
        slashCommand: slashCommand.data.name,
        userId: message.author.id,
        guildId: message.guildId,
      });
    }
  }

  const startTime = Date.now();

  try {
    logCommandExecution(
      command.name,
      message.author.id,
      message.guildId || undefined,
      message.channelId,
    );

    if (command.permissions) {
      if (command.permissions.user && message.guild) {
        const member = message.guild.members.cache.get(message.author.id);
        if (!member || !member.permissions.has(command.permissions.user)) {
          await message.reply("You don't have permission to use this command.");

          return;
        }
      }

      if (command.permissions.bot && message.guild) {
        const botMember = message.guild.members.cache.get(client.user!.id);
        if (!botMember || !botMember.permissions.has(command.permissions.bot)) {
          await message.reply("I don't have the required permissions to execute this command.");

          return;
        }
      }

      if (command.permissions.custom && !command.permissions.custom(message)) {
        await message.reply("You don't have permission to use this command.");

        return;
      }
    }

    await command.execute(message, args, client);

    // Only set cooldown after successful execution so users can retry on failure.
    CooldownManager.setCooldown(client.cooldowns, message.author.id, command.name);

    CommandAnalytics.trackLegacyCommand(message, command.name, startTime, true);
  } catch (error) {
    logError(error, {
      commandName,
      userId: message.author.id,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
    });

    CommandAnalytics.trackLegacyCommand(message, command.name, startTime, false, error as Error);

    await message.reply("There was an error executing that command.");
  }
}
