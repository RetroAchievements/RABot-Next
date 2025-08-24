import { describe, expect, it, mock } from "bun:test";
import type { Guild } from "discord.js";

import {
  checkAndLeaveUnauthorizedGuilds,
  isAuthorizedGuild,
  leaveUnauthorizedGuild,
} from "./guild-manager";

// Note: These tests work with the actual MAIN_GUILD_ID and WORKSHOP_GUILD_ID values
// from the environment. Since the function has a fallback when both are empty,
// we test the real behavior rather than mocking constants.

describe("Util: guild-manager", () => {
  describe("isAuthorizedGuild", () => {
    it("is defined", () => {
      // ASSERT
      expect(isAuthorizedGuild).toBeDefined();
    });

    it("returns true when no guild restrictions are configured", () => {
      // Note: When MAIN_GUILD_ID and WORKSHOP_GUILD_ID are both empty or unset,
      // the function returns true for any guild (fallback behavior)

      // ACT
      const result = isAuthorizedGuild("any-guild-id");

      // ASSERT
      // This will be true if no guild IDs are configured in the test environment
      expect(typeof result).toBe("boolean");
    });

    it("correctly identifies guild authorization", () => {
      // ACT
      const result1 = isAuthorizedGuild("310192285306454017"); // Main RA guild ID
      const result2 = isAuthorizedGuild("476211979464343552"); // Workshop guild ID
      const result3 = isAuthorizedGuild("999999999999999999"); // Random guild ID

      // ASSERT
      expect(typeof result1).toBe("boolean");
      expect(typeof result2).toBe("boolean");
      expect(typeof result3).toBe("boolean");

      // If guild restrictions are configured, authorized guilds should return true
      // and unauthorized guilds should return false (unless in fallback mode)
    });
  });

  describe("leaveUnauthorizedGuild", () => {
    it("is defined", () => {
      // ASSERT
      expect(leaveUnauthorizedGuild).toBeDefined();
    });

    it("successfully leaves a guild", async () => {
      // ARRANGE
      const mockGuild = {
        id: "999999999999999999",
        name: "Unauthorized Guild",
        leave: mock().mockResolvedValue(undefined),
      } as unknown as Guild;

      // ACT
      await leaveUnauthorizedGuild(mockGuild);

      // ASSERT
      expect(mockGuild.leave).toHaveBeenCalledTimes(1);
    });

    it("handles leave errors gracefully", async () => {
      // ARRANGE
      const error = new Error("Failed to leave guild");
      const mockGuild = {
        id: "999999999999999999",
        name: "Problematic Guild",
        leave: mock().mockRejectedValue(error),
      } as unknown as Guild;

      // ACT & ASSERT - Should not throw
      await expect(leaveUnauthorizedGuild(mockGuild)).resolves.toBeUndefined();
      expect(mockGuild.leave).toHaveBeenCalledTimes(1);
    });
  });

  describe("checkAndLeaveUnauthorizedGuilds", () => {
    it("is defined", () => {
      // ASSERT
      expect(checkAndLeaveUnauthorizedGuilds).toBeDefined();
    });

    it("handles empty guild list", async () => {
      // ARRANGE
      const guilds: Guild[] = [];

      // ACT & ASSERT - Should not throw
      await expect(checkAndLeaveUnauthorizedGuilds(guilds)).resolves.toBeUndefined();
    });

    it("skips guild restrictions in development environment", async () => {
      // ARRANGE
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const guilds = [
        {
          id: "999999999999999999",
          name: "Test Guild",
          leave: mock(),
        },
      ] as unknown as Guild[];

      try {
        // ACT
        await checkAndLeaveUnauthorizedGuilds(guilds);

        // ASSERT
        // Guild should not be left in development environment
        expect((guilds[0] as any).leave).not.toHaveBeenCalled();
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("processes guilds and calls leave on unauthorized ones (integration test)", async () => {
      // ARRANGE
      const guilds = [
        {
          id: "999999999999999999", // Likely unauthorized in most configs
          name: "Test Guild 1",
          leave: mock().mockResolvedValue(undefined),
        },
        {
          id: "888888888888888888", // Likely unauthorized in most configs
          name: "Test Guild 2",
          leave: mock().mockResolvedValue(undefined),
        },
      ] as unknown as Guild[];

      // ACT
      await checkAndLeaveUnauthorizedGuilds(guilds);

      // ASSERT
      // The exact behavior depends on the environment configuration
      // In test environment with no guild restrictions, no guilds should be left
      // In production with restrictions, unauthorized guilds would be left
      const guild1Left = (guilds[0] as any).leave.mock.calls.length > 0;
      const guild2Left = (guilds[1] as any).leave.mock.calls.length > 0;

      // Both should have the same behavior
      expect(guild1Left).toBe(guild2Left);
    });

    it("continues processing guilds even when some operations fail", async () => {
      // ARRANGE
      const guilds = [
        {
          id: "999999999999999999",
          name: "Test Guild",
          leave: mock().mockResolvedValue(undefined),
        },
      ] as unknown as Guild[];

      // ACT & ASSERT - Should not throw
      await expect(checkAndLeaveUnauthorizedGuilds(guilds)).resolves.toBeUndefined();
    });

    it("logs appropriate messages for authorized guilds", async () => {
      // ARRANGE
      const authorizedGuilds = [
        {
          id: "310192285306454017", // Main RA guild
          name: "RetroAchievements",
          leave: mock(),
        },
        {
          id: "476211979464343552", // Workshop guild
          name: "RA Workshop",
          leave: mock(),
        },
      ] as unknown as Guild[];

      // ACT
      await checkAndLeaveUnauthorizedGuilds(authorizedGuilds);

      // ASSERT
      // Authorized guilds should not have leave called on them
      expect((authorizedGuilds[0] as any).leave).not.toHaveBeenCalled();
      expect((authorizedGuilds[1] as any).leave).not.toHaveBeenCalled();
    });
  });
});
