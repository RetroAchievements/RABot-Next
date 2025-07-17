import type { Message } from "discord.js";

import type { BotClient } from "../models";
import { CooldownManager } from "../utils/cooldown-manager";
import { logCommandExecution, logError, logMigrationNotice } from "../utils/logger";
import { sendMigrationNotice } from "../utils/migration-helper";

export async function handleMessage(message: Message, client: BotClient): Promise<void> {
  // Ignore messages from bots.
  if (message.author.bot) return;

  // Check if message starts with the command prefix.
  const prefix = client.commandPrefix || "!";
  if (!message.content.startsWith(prefix)) return;

  // Parse command and arguments.
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Find command by name or alias.
  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases?.includes(commandName));

  if (!command) return;

  // Check cooldowns.
  const remainingCooldown = CooldownManager.checkCooldown(
    client.cooldowns,
    message.author.id,
    command.name,
    command.cooldown,
  );

  if (remainingCooldown > 0) {
    const cooldownMessage = CooldownManager.formatCooldownMessage(remainingCooldown);
    const reply = await message.reply(cooldownMessage);
    // Delete cooldown message after 5 seconds.
    setTimeout(() => reply.delete().catch(() => {}), 5000);

    return;
  }

  // Check if there's a corresponding slash command for migration notice.
  const slashCommand = client.slashCommands.find((cmd) => {
    // Check if the legacy command name matches what the user typed
    return cmd.legacyName === commandName;
  });

  if (slashCommand) {
    logMigrationNotice(
      commandName,
      slashCommand.data.name,
      message.author.id,
      message.guildId || undefined,
    );
    // Send migration notice.
    try {
      await sendMigrationNotice(message, slashCommand.data.name, {
        executeAfterNotice: true,
        deleteAfter: 15000, // 15 seconds
        useEphemeralButton: false, // Use simple temporary message
      });
    } catch (error) {
      logError(error, {
        event: "migration_notice_error",
        legacyCommand: commandName,
        slashCommand: slashCommand.data.name,
        userId: message.author.id,
        guildId: message.guildId || undefined,
      });
    }
  }

  try {
    // Log command execution
    logCommandExecution(
      command.name,
      message.author.id,
      message.guildId || undefined,
      message.channelId,
    );

    // Check permissions if specified.
    if (command.permissions) {
      // Check user permissions.
      if (command.permissions.user && message.guild) {
        const member = message.guild.members.cache.get(message.author.id);
        if (!member || !member.permissions.has(command.permissions.user)) {
          await message.reply("You don't have permission to use this command.");

          return;
        }
      }

      // Check bot permissions.
      if (command.permissions.bot && message.guild) {
        const botMember = message.guild.members.cache.get(client.user!.id);
        if (!botMember || !botMember.permissions.has(command.permissions.bot)) {
          await message.reply("I don't have the required permissions to execute this command.");

          return;
        }
      }

      // Check custom permissions.
      if (command.permissions.custom && !command.permissions.custom(message)) {
        await message.reply("You don't have permission to use this command.");

        return;
      }
    }

    // Execute the command.
    await command.execute(message, args, client);

    // Set cooldown after successful execution.
    CooldownManager.setCooldown(client.cooldowns, message.author.id, command.name);
  } catch (error) {
    logError(error, {
      commandName,
      userId: message.author.id,
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      messageId: message.id,
    });
    await message.reply("There was an error executing that command.");
  }
}
