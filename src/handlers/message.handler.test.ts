import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Collection, PermissionsBitField } from "discord.js";

import type { BotClient, Command, SlashCommand } from "../models";
import { createMockClient, createMockMessage } from "../test/mocks/discord.mock";
import { CommandAnalytics } from "../utils/command-analytics";
import { CooldownManager } from "../utils/cooldown-manager";
import * as logger from "../utils/logger";
import * as migrationHelper from "../utils/migration-helper";
import { handleMessage } from "./message.handler";

describe("Handler: handleMessage", () => {
  let mockClient: BotClient;
  let mockCommand: Command;
  let mockSlashCommand: SlashCommand;

  afterEach(() => {
    // ... clear all mock calls ...
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // ... reset all mocks ...
    mockCommand = {
      name: "test",
      aliases: ["t", "tst"],
      description: "Test command",
      usage: "!test",
      category: "utility",
      execute: vi.fn(() => Promise.resolve()),
    };

    mockSlashCommand = {
      data: {
        name: "test",
        description: "Test slash command",
      } as any,
      legacyName: "test",
      execute: vi.fn(() => Promise.resolve()),
    };

    mockClient = createMockClient({
      commands: new Collection([["test", mockCommand]]),
      slashCommands: new Collection([["test", mockSlashCommand]]),
      commandPrefix: "!",
    });

    // ... spy on utility functions ...
    vi.spyOn(CooldownManager, "checkCooldown").mockReturnValue(0);
    vi.spyOn(CooldownManager, "setCooldown").mockImplementation(() => {});
    vi.spyOn(CooldownManager, "formatCooldownMessage").mockReturnValue("⏱️ Please wait **3** seconds");
    vi.spyOn(CommandAnalytics, "startTracking").mockReturnValue(Date.now());
    vi.spyOn(CommandAnalytics, "trackLegacyCommand").mockImplementation(() => {});
    vi.spyOn(logger, "logCommandExecution").mockImplementation(() => logger.logger);
    vi.spyOn(logger, "logError").mockImplementation(() => {});
    vi.spyOn(logger, "logMigrationNotice").mockImplementation(() => {});
    vi.spyOn(migrationHelper, "sendMigrationNotice").mockResolvedValue(null);
  });

  it("is defined", () => {
    // ASSERT
    expect(handleMessage).toBeDefined();
  });

  it("ignores messages from bots", async () => {
    // ARRANGE
    const message = createMockMessage({
      author: { bot: true } as any,
      content: "!test",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("ignores messages without the command prefix", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "test command",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("ignores messages with only the prefix", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("executes a command when found by name", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!test arg1 arg2",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).toHaveBeenCalledWith(message, ["arg1", "arg2"], mockClient);
    expect(CooldownManager.setCooldown).toHaveBeenCalledWith(
      mockClient.cooldowns,
      message.author.id,
      "test",
    );
  });

  it("executes a command when found by alias", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!tst arg1",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).toHaveBeenCalledWith(message, ["arg1"], mockClient);
  });

  it("ignores unknown commands", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!unknown",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("enforces cooldowns", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!test",
    });
    (CooldownManager.checkCooldown as any).mockReturnValue(3000); // ... 3 seconds remaining ...

    const mockReply = { delete: vi.fn(() => Promise.resolve()) };
    message.reply = vi.fn(() => Promise.resolve(mockReply as any));

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith("⏱️ Please wait **3** seconds");
    expect(CooldownManager.setCooldown).not.toHaveBeenCalled();
  });

  it("sends migration notice for commands with slash equivalents", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!test",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(logger.logMigrationNotice).toHaveBeenCalledWith(
      "test",
      "test",
      message.author.id,
      message.guildId,
    );
    expect(migrationHelper.sendMigrationNotice).toHaveBeenCalledWith(message, "test", {
      executeAfterNotice: true,
      deleteAfter: 15000,
      useEphemeralButton: false,
    });
    expect(mockCommand.execute).toHaveBeenCalled();
  });

  it("checks user permissions when specified", async () => {
    // ARRANGE
    mockCommand.permissions = {
      user: [PermissionsBitField.Flags.ManageGuild],
    };

    const message = createMockMessage({
      content: "!test",
    });

    // ... member doesn't have ManageGuild permission ...
    if (message.guild && message.guild.members) {
      (message.guild.members.cache as any).set(message.author.id, {
        permissions: new PermissionsBitField(["SendMessages"]),
      });
    }

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(message.reply).toHaveBeenCalledWith("You don't have permission to use this command.");
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("checks bot permissions when specified", async () => {
    // ARRANGE
    mockCommand.permissions = {
      bot: [PermissionsBitField.Flags.EmbedLinks],
    };

    const message = createMockMessage({
      content: "!test",
    });

    // ... bot doesn't have EmbedLinks permission ...
    if (message.guild && message.guild.members && mockClient.user) {
      (message.guild.members.cache as any).set(mockClient.user.id, {
        permissions: new PermissionsBitField(["SendMessages"]),
      });
    }

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(message.reply).toHaveBeenCalledWith(
      "I don't have the required permissions to execute this command.",
    );
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("checks custom permissions when specified", async () => {
    // ARRANGE
    mockCommand.permissions = {
      custom: (msg) => msg.author.id === "allowedUser123",
    };

    const message = createMockMessage({
      content: "!test",
      author: { id: "notAllowedUser" } as any,
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(message.reply).toHaveBeenCalledWith("You don't have permission to use this command.");
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it("tracks command analytics on success", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!test",
    });
    const startTime = Date.now();
    (CommandAnalytics.startTracking as any).mockReturnValue(startTime);

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(CommandAnalytics.trackLegacyCommand).toHaveBeenCalledWith(
      message,
      "test",
      startTime,
      true,
    );
  });

  it("handles and logs command execution errors", async () => {
    // ARRANGE
    const testError = new Error("Test error");
    mockCommand.execute = vi.fn(() => Promise.reject(testError));

    const message = createMockMessage({
      content: "!test",
    });
    const startTime = Date.now();
    (CommandAnalytics.startTracking as any).mockReturnValue(startTime);

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(logger.logError).toHaveBeenCalledWith(testError, {
      commandName: "test",
      userId: message.author.id,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
    });
    expect(CommandAnalytics.trackLegacyCommand).toHaveBeenCalledWith(
      message,
      "test",
      startTime,
      false,
      testError,
    );
    expect(message.reply).toHaveBeenCalledWith("There was an error executing that command.");
  });

  it("handles migration notice errors gracefully", async () => {
    // ARRANGE
    const migrationError = new Error("Migration error");
    (migrationHelper.sendMigrationNotice as any).mockRejectedValue(migrationError);

    const message = createMockMessage({
      content: "!test",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(logger.logError).toHaveBeenCalledWith(migrationError, {
      event: "migration_notice_error",
      legacyCommand: "test",
      slashCommand: "test",
      userId: message.author.id,
      guildId: message.guildId,
    });
    // ... command should still execute despite migration notice error ...
    expect(mockCommand.execute).toHaveBeenCalled();
  });

  it("works with different command prefixes", async () => {
    // ARRANGE
    mockClient.commandPrefix = "?";
    const message = createMockMessage({
      content: "?test",
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).toHaveBeenCalled();
  });

  it("handles commands in DMs (no guild)", async () => {
    // ARRANGE
    const message = createMockMessage({
      content: "!test",
      guild: null,
      guildId: null,
    });

    // ACT
    await handleMessage(message, mockClient);

    // ASSERT
    expect(mockCommand.execute).toHaveBeenCalled();
    expect(logger.logCommandExecution).toHaveBeenCalledWith(
      "test",
      message.author.id,
      undefined,
      message.channelId,
    );
  });
});
