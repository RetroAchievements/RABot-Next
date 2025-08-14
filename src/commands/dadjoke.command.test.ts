import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DadjokeService } from "../services/dadjoke.service";
import { createMockMessage } from "../test/mocks/discord.mock";
import dadjokeCommand from "./dadjoke.command";

// Mock the DadjokeService
vi.mock("../services/dadjoke.service");

describe("Command: dadjoke", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("replies with joke when service returns joke", async () => {
      // ARRANGE
      const mockJoke = "Why don't scientists trust atoms? Because they make up everything!";
      vi.mocked(DadjokeService.fetchRandomJoke).mockResolvedValue(mockJoke);

      // ACT
      await dadjokeCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
      expect(mockMessage.reply).toHaveBeenCalledWith(mockJoke);
    });

    it("replies with error message when service returns null", async () => {
      // ARRANGE
      vi.mocked(DadjokeService.fetchRandomJoke).mockResolvedValue(null);

      // ACT
      await dadjokeCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Sorry, I couldn't fetch a dad joke right now. Try again later!",
      );
    });

    it("replies with error message when service returns empty string", async () => {
      // ARRANGE
      vi.mocked(DadjokeService.fetchRandomJoke).mockResolvedValue("");

      // ACT
      await dadjokeCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Sorry, I couldn't fetch a dad joke right now. Try again later!",
      );
    });

    it("handles service rejection gracefully", async () => {
      // ARRANGE
      vi.mocked(DadjokeService.fetchRandomJoke).mockRejectedValue(new Error("API error"));

      // ACT & ASSERT
      await expect(dadjokeCommand.execute(mockMessage, [], {} as any)).rejects.toThrow("API error");
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
    });
  });
});
