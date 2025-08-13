import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DadjokeService } from "../services/dadjoke.service";
import { createMockInteraction } from "../test/mocks/discord.mock";
import dadjokeSlashCommand from "./dadjoke.command";

describe("SlashCommand: dadjoke", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "dadjoke",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is defined", () => {
    expect(dadjokeSlashCommand).toBeDefined();
    expect(dadjokeSlashCommand.data.name).toBe("dadjoke");
    expect(dadjokeSlashCommand.data.description).toBe("Get a random dad joke");
    expect(dadjokeSlashCommand.legacyName).toBe("dadjoke");
    expect(dadjokeSlashCommand.cooldown).toBe(3);
  });

  describe("execute", () => {
    it("displays a dad joke when fetch is successful", async () => {
      // ARRANGE
      const mockJoke = "Why don't scientists trust atoms? Because they make up everything!";
      vi.spyOn(DadjokeService, "fetchRandomJoke").mockResolvedValue(mockJoke);

      // ACT
      await dadjokeSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(mockJoke);
    });

    it("displays error message when fetch fails", async () => {
      // ARRANGE
      vi.spyOn(DadjokeService, "fetchRandomJoke").mockResolvedValue(null);

      // ACT
      await dadjokeSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(DadjokeService.fetchRandomJoke).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        "Sorry, I couldn't fetch a dad joke right now. Try again later!",
      );
    });

    it("defers reply before fetching joke", async () => {
      // ARRANGE
      const mockJoke = "I'm afraid for the calendar. Its days are numbered.";
      let deferReplyCalled = false;
      let fetchJokeCalled = false;

      mockInteraction.deferReply = vi.fn(async () => {
        deferReplyCalled = true;
        expect(fetchJokeCalled).toBe(false); // Ensure defer is called before fetch.
      }) as any;

      vi.spyOn(DadjokeService, "fetchRandomJoke").mockImplementation(async () => {
        fetchJokeCalled = true;
        expect(deferReplyCalled).toBe(true); // Ensure defer was called first.

        return mockJoke;
      });

      // ACT
      await dadjokeSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(deferReplyCalled).toBe(true);
      expect(fetchJokeCalled).toBe(true);
    });
  });
});
