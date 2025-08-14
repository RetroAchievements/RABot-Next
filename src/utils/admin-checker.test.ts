import type { ChatInputCommandInteraction, Message } from "discord.js";
import { describe, expect, it } from "vitest";

import { AdminChecker } from "./admin-checker";

describe("Util: AdminChecker", () => {
  describe("isAdminFromMessage", () => {
    it("given a user with Discord Administrator permissions, returns true", () => {
      // ARRANGE
      const mockMessage = {
        author: { id: "user123" },
        guild: {
          members: {
            cache: {
              get: () => ({
                permissions: {
                  has: (permission: string) => permission === "Administrator",
                },
              }),
            },
          },
        },
      } as unknown as Message;

      // ACT
      const isAdmin = AdminChecker.isAdminFromMessage(mockMessage);

      // ASSERT
      expect(isAdmin).toBe(true);
    });

    it("given a regular user without admin permissions, returns false", () => {
      // ARRANGE
      const mockMessage = {
        author: { id: "user123" },
        guild: {
          members: {
            cache: {
              get: () => ({
                permissions: {
                  has: () => false,
                },
              }),
            },
          },
        },
      } as unknown as Message;

      // ACT
      const isAdmin = AdminChecker.isAdminFromMessage(mockMessage);

      // ASSERT
      expect(isAdmin).toBe(false);
    });

    it("given a user not in guild, returns false", () => {
      // ARRANGE
      const mockMessage = {
        author: { id: "user123" },
        guild: null,
      } as unknown as Message;

      // ACT
      const isAdmin = AdminChecker.isAdminFromMessage(mockMessage);

      // ASSERT
      expect(isAdmin).toBe(false);
    });

    it("given a user not found in guild cache, returns false", () => {
      // ARRANGE
      const mockMessage = {
        author: { id: "user123" },
        guild: {
          members: {
            cache: {
              get: () => null,
            },
          },
        },
      } as unknown as Message;

      // ACT
      const isAdmin = AdminChecker.isAdminFromMessage(mockMessage);

      // ASSERT
      expect(isAdmin).toBe(false);
    });
  });

  describe("isAdminFromInteraction", () => {
    it("given a user with Discord Administrator permissions, returns true", () => {
      // ARRANGE
      const mockInteraction = {
        user: { id: "user123" },
        guild: { id: "guild123" },
        member: {
          permissions: {
            has: (permission: string) => permission === "Administrator",
          },
        },
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const isAdmin = AdminChecker.isAdminFromInteraction(mockInteraction);

      // ASSERT
      expect(isAdmin).toBe(true);
    });

    it("given a regular user without admin permissions, returns false", () => {
      // ARRANGE
      const mockInteraction = {
        user: { id: "user123" },
        guild: { id: "guild123" },
        member: {
          permissions: {
            has: () => false,
          },
        },
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const isAdmin = AdminChecker.isAdminFromInteraction(mockInteraction);

      // ASSERT
      expect(isAdmin).toBe(false);
    });

    it("given a user not in guild, returns false", () => {
      // ARRANGE
      const mockInteraction = {
        user: { id: "user123" },
        guild: null,
        member: null,
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const isAdmin = AdminChecker.isAdminFromInteraction(mockInteraction);

      // ASSERT
      expect(isAdmin).toBe(false);
    });

    it("given a string member (partial data), returns false", () => {
      // ARRANGE
      const mockInteraction = {
        user: { id: "user123" },
        guild: { id: "guild123" },
        member: "partial_member_string",
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const isAdmin = AdminChecker.isAdminFromInteraction(mockInteraction);

      // ASSERT
      expect(isAdmin).toBe(false);
    });

    it("given member with string permissions, returns false", () => {
      // ARRANGE
      const mockInteraction = {
        user: { id: "user123" },
        guild: { id: "guild123" },
        member: {
          permissions: "8", // String representation of permissions
        },
      } as unknown as ChatInputCommandInteraction;

      // ACT
      const isAdmin = AdminChecker.isAdminFromInteraction(mockInteraction);

      // ASSERT
      expect(isAdmin).toBe(false);
    });
  });
});
