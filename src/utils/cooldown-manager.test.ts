import { Collection } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";

import { CooldownManager } from "./cooldown-manager";

describe("Util: CooldownManager", () => {
  let cooldowns: Collection<string, Collection<string, number>>;

  beforeEach(() => {
    cooldowns = new Collection();
  });

  describe("checkCooldown", () => {
    it("given the command has no cooldowns set, returns 0", () => {
      // ACT
      const remainingTime = CooldownManager.checkCooldown(cooldowns, "user123", "ping");

      // ASSERT
      expect(remainingTime).toEqual(0);
    });

    it("given the user is not on cooldown, returns 0", () => {
      // ARRANGE
      cooldowns.set("ping", new Collection());

      // ACT
      const remainingTime = CooldownManager.checkCooldown(cooldowns, "user123", "ping");

      // ASSERT
      expect(remainingTime).toEqual(0);
    });

    it("given the user is on cooldown, returns the remaining time in milliseconds", () => {
      // ARRANGE
      const now = Date.now();
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", now);
      cooldowns.set("ping", timestamps);

      // ACT
      const remainingTime = CooldownManager.checkCooldown(
        cooldowns,
        "user123",
        "ping",
        5, // ... 5 second cooldown ...
      );

      // ASSERT
      expect(remainingTime).toBeGreaterThan(4900);
      expect(remainingTime).toBeLessThanOrEqual(5000);
    });

    it("given the cooldown has expired, returns 0", () => {
      // ARRANGE
      const pastTimestamp = Date.now() - 10000; // ... 10 seconds ago ...
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", pastTimestamp);
      cooldowns.set("ping", timestamps);

      // ACT
      const remainingTime = CooldownManager.checkCooldown(
        cooldowns,
        "user123",
        "ping",
        5, // ... 5 second cooldown ...
      );

      // ASSERT
      expect(remainingTime).toEqual(0);
    });
  });

  describe("setCooldown", () => {
    it("given a new command, creates a new collection and sets the cooldown", () => {
      // ACT
      CooldownManager.setCooldown(cooldowns, "user123", "ping");

      // ASSERT
      expect(cooldowns.has("ping")).toEqual(true);
      expect(cooldowns.get("ping")?.has("user123")).toEqual(true);
    });

    it("given an existing command, adds the user to the existing collection", () => {
      // ARRANGE
      cooldowns.set("ping", new Collection());

      // ACT
      CooldownManager.setCooldown(cooldowns, "user123", "ping");

      // ASSERT
      expect(cooldowns.get("ping")?.has("user123")).toEqual(true);
    });

    it("sets the timestamp to the current time", () => {
      // ARRANGE
      const timeBefore = Date.now();

      // ACT
      CooldownManager.setCooldown(cooldowns, "user123", "ping");

      // ASSERT
      const timestamp = cooldowns.get("ping")?.get("user123");
      expect(timestamp).toBeDefined();
      expect(timestamp).toBeGreaterThanOrEqual(timeBefore);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("formatCooldownMessage", () => {
    it("given 1 second remaining, returns a singular message", () => {
      // ACT
      const message = CooldownManager.formatCooldownMessage(1000);

      // ASSERT
      expect(message).toEqual("⏱️ Please wait **1** second before using this command again.");
    });

    it("given multiple seconds remaining, returns a plural message", () => {
      // ACT
      const message = CooldownManager.formatCooldownMessage(3500);

      // ASSERT
      expect(message).toEqual("⏱️ Please wait **4** seconds before using this command again.");
    });

    it("given less than 1 second remaining, rounds up to 1 second", () => {
      // ACT
      const message = CooldownManager.formatCooldownMessage(500);

      // ASSERT
      expect(message).toEqual("⏱️ Please wait **1** second before using this command again.");
    });
  });

  describe("checkCooldownWithBypass", () => {
    it("given the user is an admin, returns 0 even if cooldown exists", () => {
      // ARRANGE
      const now = Date.now();
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", now);
      cooldowns.set("ping", timestamps);

      // ACT
      const remainingTime = CooldownManager.checkCooldownWithBypass(
        cooldowns,
        "user123",
        "ping",
        true, // ... is admin ...
        5, // ... 5 second cooldown ...
      );

      // ASSERT
      expect(remainingTime).toEqual(0);
    });

    it("given the user is not an admin and has no cooldown, returns 0", () => {
      // ARRANGE
      cooldowns.set("ping", new Collection());

      // ACT
      const remainingTime = CooldownManager.checkCooldownWithBypass(
        cooldowns,
        "user123",
        "ping",
        false, // ... is not admin ...
        5,
      );

      // ASSERT
      expect(remainingTime).toEqual(0);
    });

    it("given the user is not an admin and has an active cooldown, returns remaining time", () => {
      // ARRANGE
      const now = Date.now();
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", now);
      cooldowns.set("ping", timestamps);

      // ACT
      const remainingTime = CooldownManager.checkCooldownWithBypass(
        cooldowns,
        "user123",
        "ping",
        false, // ... is not admin ...
        5, // ... 5 second cooldown ...
      );

      // ASSERT
      expect(remainingTime).toBeGreaterThan(4900);
      expect(remainingTime).toBeLessThanOrEqual(5000);
    });

    it("given the user is not an admin and cooldown has expired, returns 0", () => {
      // ARRANGE
      const pastTimestamp = Date.now() - 10000; // ... 10 seconds ago ...
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", pastTimestamp);
      cooldowns.set("ping", timestamps);

      // ACT
      const remainingTime = CooldownManager.checkCooldownWithBypass(
        cooldowns,
        "user123",
        "ping",
        false, // ... is not admin ...
        5, // ... 5 second cooldown ...
      );

      // ASSERT
      expect(remainingTime).toEqual(0);
    });
  });

  describe("cleanupExpiredCooldowns", () => {
    it("given no cooldowns, returns 0", () => {
      // ACT
      const cleanedCount = CooldownManager.cleanupExpiredCooldowns(cooldowns);

      // ASSERT
      expect(cleanedCount).toEqual(0);
    });

    it("given only active cooldowns, returns 0 and keeps all cooldowns", () => {
      // ARRANGE
      const now = Date.now();
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", now);
      timestamps.set("user456", now - 1000); // ... 1 second ago ...
      cooldowns.set("ping", timestamps);

      // ACT
      const cleanedCount = CooldownManager.cleanupExpiredCooldowns(cooldowns, 5);

      // ASSERT
      expect(cleanedCount).toEqual(0);
      expect(cooldowns.get("ping")?.size).toEqual(2);
    });

    it("given expired cooldowns, removes them and returns the count", () => {
      // ARRANGE
      const now = Date.now();
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", now); // ... current - should remain ...
      timestamps.set("user456", now - 10000); // ... 10 seconds ago - should be removed ...
      cooldowns.set("ping", timestamps);

      // ACT
      const cleanedCount = CooldownManager.cleanupExpiredCooldowns(cooldowns, 5);

      // ASSERT
      expect(cleanedCount).toEqual(1);
      expect(cooldowns.get("ping")?.has("user123")).toEqual(true);
      expect(cooldowns.get("ping")?.has("user456")).toEqual(false);
    });

    it("given all cooldowns for a command are expired, removes the command collection", () => {
      // ARRANGE
      const oldTimestamp = Date.now() - 10000; // ... 10 seconds ago ...
      const timestamps = new Collection<string, number>();
      timestamps.set("user123", oldTimestamp);
      cooldowns.set("ping", timestamps);

      // ACT
      const cleanedCount = CooldownManager.cleanupExpiredCooldowns(cooldowns, 5);

      // ASSERT
      expect(cleanedCount).toEqual(1);
      expect(cooldowns.has("ping")).toEqual(false);
    });

    it("can clean multiple commands at once", () => {
      // ARRANGE
      const now = Date.now();
      const oldTimestamp = now - 10000; // ... 10 seconds ago ...

      // ... ping command - mixed timestamps ...
      const pingTimestamps = new Collection<string, number>();
      pingTimestamps.set("user123", now); // ... current ...
      pingTimestamps.set("user456", oldTimestamp); // ... expired ...
      cooldowns.set("ping", pingTimestamps);

      // ... status command - all expired ...
      const statusTimestamps = new Collection<string, number>();
      statusTimestamps.set("user789", oldTimestamp); // ... expired ...
      cooldowns.set("status", statusTimestamps);

      // ACT
      const cleanedCount = CooldownManager.cleanupExpiredCooldowns(cooldowns, 5);

      // ASSERT
      expect(cleanedCount).toEqual(2);
      expect(cooldowns.has("ping")).toEqual(true);
      expect(cooldowns.get("ping")?.size).toEqual(1);
      expect(cooldowns.has("status")).toEqual(false);
    });
  });
});
