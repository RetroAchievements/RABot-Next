import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { requireGuild } from "./guild-restrictions";

describe("Util: guild-restrictions", () => {
  describe("requireGuild", () => {
    it("returns true when interaction guildId matches allowedGuildId", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "123456789012345678",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "123456789012345678");

      // ASSERT
      expect(result).toBe(true);
      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it("returns false when interaction guildId does not match allowedGuildId", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "123456789012345678",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "999999999999999999");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("returns false when interaction guildId is null (DM)", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: null,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "123456789012345678");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("returns false when interaction guildId is undefined", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: undefined,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "123456789012345678");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("uses custom error message when provided", async () => {
      // ARRANGE
      const customMessage = "This command is restricted to specific servers.";
      const mockInteraction = {
        guildId: "wrong-guild-id",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "correct-guild-id", customMessage);

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: customMessage,
        flags: MessageFlags.Ephemeral,
      });
    });

    it("uses default error message when custom message is not provided", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "wrong-guild-id",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "correct-guild-id");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("handles empty string guildId correctly", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "123456789012345678");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("handles empty string allowedGuildId correctly", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "123456789012345678",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "");

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("is case sensitive for guild ID comparison", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "123456789012345678",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "123456789012345679"); // Different by 1 digit

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("properly awaits the reply call", async () => {
      // ARRANGE
      let replyResolved = false;
      const mockInteraction = {
        guildId: "wrong-guild",
        reply: vi.fn(async () => {
          replyResolved = true;

          return Promise.resolve();
        }),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, "correct-guild");

      // ASSERT
      expect(result).toBe(false);
      expect(replyResolved).toBe(true);
      expect(mockInteraction.reply).toHaveBeenCalled();
    });

    it("sends ephemeral response that only the user can see", async () => {
      // ARRANGE
      const mockInteraction = {
        guildId: "wrong-guild",
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      await requireGuild(mockInteraction, "correct-guild");

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.any(String),
        flags: MessageFlags.Ephemeral,
      });
    });

    it("works with real Discord guild ID formats", async () => {
      // ARRANGE - using actual Discord snowflake format
      const realGuildId = "310192285306454017"; // Main RA server ID
      const mockInteraction = {
        guildId: realGuildId,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, realGuildId);

      // ASSERT
      expect(result).toBe(true);
      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it("works with workshop guild ID", async () => {
      // ARRANGE - using workshop server ID
      const workshopGuildId = "476211979464343552"; // Workshop server ID
      const mockInteraction = {
        guildId: workshopGuildId,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, workshopGuildId);

      // ASSERT
      expect(result).toBe(true);
      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it("rejects main guild when workshop guild is required", async () => {
      // ARRANGE
      const mainGuildId = "310192285306454017";
      const workshopGuildId = "476211979464343552";
      const mockInteraction = {
        guildId: mainGuildId,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, workshopGuildId);

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });

    it("rejects workshop guild when main guild is required", async () => {
      // ARRANGE
      const mainGuildId = "310192285306454017";
      const workshopGuildId = "476211979464343552";
      const mockInteraction = {
        guildId: workshopGuildId,
        reply: vi.fn(),
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const result = await requireGuild(mockInteraction, mainGuildId);

      // ASSERT
      expect(result).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "You can't use this here.",
        flags: MessageFlags.Ephemeral,
      });
    });
  });
});
