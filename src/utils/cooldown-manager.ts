import { Collection } from "discord.js";

import { COMMAND_COOLDOWN_MS } from "../config/constants";

export class CooldownManager {
  /**
   * Check if a user is on cooldown for a specific command.
   * @param cooldowns - The cooldowns collection from the bot client.
   * @param userId - The user's ID.
   * @param commandName - The command name.
   * @param cooldownTime - The cooldown time in seconds (optional).
   * @returns The remaining cooldown time in milliseconds, or 0 if no cooldown.
   */
  static checkCooldown(
    cooldowns: Collection<string, Collection<string, number>>,
    userId: string,
    commandName: string,
    cooldownTime?: number,
  ): number {
    if (!cooldowns.has(commandName)) {
      return 0;
    }

    const timestamps = cooldowns.get(commandName)!;
    const cooldownAmount = (cooldownTime || COMMAND_COOLDOWN_MS / 1000) * 1000;

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount;

      if (Date.now() < expirationTime) {
        return expirationTime - Date.now();
      }
    }

    return 0;
  }

  /**
   * Set a cooldown for a user on a specific command.
   * @param cooldowns - The cooldowns collection from the bot client.
   * @param userId - The user's ID.
   * @param commandName - The command name.
   */
  static setCooldown(
    cooldowns: Collection<string, Collection<string, number>>,
    userId: string,
    commandName: string,
  ): void {
    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Collection());
    }

    const timestamps = cooldowns.get(commandName)!;
    timestamps.set(userId, Date.now());
  }

  /**
   * Format a cooldown message showing remaining time.
   * @param remainingTime - The remaining time in milliseconds.
   * @returns A formatted cooldown message.
   */
  static formatCooldownMessage(remainingTime: number): string {
    const seconds = Math.ceil(remainingTime / 1000);

    return `⏱️ Please wait **${seconds}** second${seconds !== 1 ? "s" : ""} before using this command again.`;
  }

  /**
   * Clean up expired cooldowns to prevent memory leaks.
   * @param cooldowns - The cooldowns collection from the bot client.
   * @param cooldownTime - The default cooldown time in seconds.
   * @returns The number of cooldowns that were cleaned up.
   */
  static cleanupExpiredCooldowns(
    cooldowns: Collection<string, Collection<string, number>>,
    cooldownTime: number = COMMAND_COOLDOWN_MS / 1000,
  ): number {
    const now = Date.now();
    const cooldownAmount = cooldownTime * 1000;
    let cleanedCount = 0;

    for (const [commandName, timestamps] of cooldowns.entries()) {
      for (const [userId, timestamp] of timestamps.entries()) {
        if (now > timestamp + cooldownAmount) {
          timestamps.delete(userId);
          cleanedCount++;
        }
      }

      // Remove empty command collections.
      if (timestamps.size === 0) {
        cooldowns.delete(commandName);
      }
    }

    return cleanedCount;
  }
}
