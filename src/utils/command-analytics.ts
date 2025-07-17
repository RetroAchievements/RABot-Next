import type { CommandInteraction, Message } from "discord.js";

import { logger } from "./logger";

export interface CommandMetrics {
  commandName: string;
  userId: string;
  guildId?: string;
  channelId: string;
  executionTime: number;
  success: boolean;
  errorType?: string;
  isSlashCommand: boolean;
}

export class CommandAnalytics {
  private static commandMetrics = new Map<string, number>();
  private static userCommandCounts = new Map<string, Map<string, number>>();
  private static guildCommandCounts = new Map<string, Map<string, number>>();

  /**
   * Track the start of a command execution.
   */
  static startTracking(): number {
    return Date.now();
  }

  /**
   * Track a legacy command execution.
   */
  static trackLegacyCommand(
    message: Message,
    commandName: string,
    startTime: number,
    success: boolean,
    error?: Error,
  ): void {
    const executionTime = Date.now() - startTime;

    const metrics: CommandMetrics = {
      commandName,
      userId: message.author.id,
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      executionTime,
      success,
      errorType: error?.name,
      isSlashCommand: false,
    };

    this.logMetrics(metrics);
    this.updateCounters(metrics);
  }

  /**
   * Track a slash command execution.
   */
  static trackSlashCommand(
    interaction: CommandInteraction,
    startTime: number,
    success: boolean,
    error?: Error,
  ): void {
    const executionTime = Date.now() - startTime;

    const metrics: CommandMetrics = {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      executionTime,
      success,
      errorType: error?.name,
      isSlashCommand: true,
    };

    this.logMetrics(metrics);
    this.updateCounters(metrics);
  }

  /**
   * Log command metrics.
   */
  private static logMetrics(metrics: CommandMetrics): void {
    logger.info(
      {
        event: "command_executed",
        ...metrics,
      },
      `Command ${metrics.success ? "succeeded" : "failed"}: ${metrics.isSlashCommand ? "/" : "!"}${metrics.commandName}`,
    );
  }

  /**
   * Update internal counters for analytics.
   */
  private static updateCounters(metrics: CommandMetrics): void {
    // Update total command count
    const currentCount = this.commandMetrics.get(metrics.commandName) || 0;
    this.commandMetrics.set(metrics.commandName, currentCount + 1);

    // Update user command count
    if (!this.userCommandCounts.has(metrics.userId)) {
      this.userCommandCounts.set(metrics.userId, new Map());
    }
    const userCommands = this.userCommandCounts.get(metrics.userId)!;
    const userCommandCount = userCommands.get(metrics.commandName) || 0;
    userCommands.set(metrics.commandName, userCommandCount + 1);

    // Update guild command count
    if (metrics.guildId) {
      if (!this.guildCommandCounts.has(metrics.guildId)) {
        this.guildCommandCounts.set(metrics.guildId, new Map());
      }
      const guildCommands = this.guildCommandCounts.get(metrics.guildId)!;
      const guildCommandCount = guildCommands.get(metrics.commandName) || 0;
      guildCommands.set(metrics.commandName, guildCommandCount + 1);
    }
  }

  /**
   * Get command usage statistics.
   */
  static getStatistics(): {
    totalCommands: number;
    commandCounts: Record<string, number>;
    topUsers: Array<{ userId: string; commandCount: number }>;
    topGuilds: Array<{ guildId: string; commandCount: number }>;
  } {
    // Calculate total commands
    let totalCommands = 0;
    const commandCounts: Record<string, number> = {};

    for (const [command, count] of this.commandMetrics) {
      totalCommands += count;
      commandCounts[command] = count;
    }

    // Calculate top users
    const userTotals = new Map<string, number>();
    for (const [userId, commands] of this.userCommandCounts) {
      let total = 0;
      for (const count of commands.values()) {
        total += count;
      }
      userTotals.set(userId, total);
    }

    const topUsers = Array.from(userTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, commandCount]) => ({ userId, commandCount }));

    // Calculate top guilds
    const guildTotals = new Map<string, number>();
    for (const [guildId, commands] of this.guildCommandCounts) {
      let total = 0;
      for (const count of commands.values()) {
        total += count;
      }
      guildTotals.set(guildId, total);
    }

    const topGuilds = Array.from(guildTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([guildId, commandCount]) => ({ guildId, commandCount }));

    return {
      totalCommands,
      commandCounts,
      topUsers,
      topGuilds,
    };
  }

  /**
   * Reset all analytics data.
   */
  static reset(): void {
    this.commandMetrics.clear();
    this.userCommandCounts.clear();
    this.guildCommandCounts.clear();
    logger.info("Command analytics data has been reset");
  }
}
