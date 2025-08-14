import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockMessage } from "../test/mocks/discord.mock";
import ruleCommand from "./rule.command";

describe("Command: rule", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("shows all rules by default when no arguments", async () => {
      // ARRANGE
      mockMessage.content = "!rules";

      // ACT
      await ruleCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("__**RULES**__\n**Simple Version**:"),
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("**1.** Don't be a jerk or generally obnoxious"),
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining(
          "**Complete Version**: <https://docs.retroachievements.org/Users-Code-of-Conduct/>",
        ),
      );
    });

    it("shows specific rule 1", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["1"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**1.** Don't be a jerk or generally obnoxious - nobody likes trolls.",
      );
    });

    it("shows specific rule 2", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["2"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**2.** Don't use our website or Discord server to share copyrighted material or information about where they can be downloaded.",
      );
    });

    it("shows specific rule 3", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["3"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**3.** Keep the Discord channels and forum threads on-topic (we do have a section for off-topic chatting, though).",
      );
    });

    it("shows specific rule 4", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["4"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**4.** When a moderator/admin asks you to stop, you should stop.",
      );
    });

    it("shows specific rule 5", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["5"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith("**5.** When in doubt, ask a @mod");
    });

    it("shows Code of Conduct when requested", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["coc"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**Complete Version**: <https://docs.retroachievements.org/Users-Code-of-Conduct/>",
      );
    });

    it("handles case insensitive coc argument", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["COC"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**Complete Version**: <https://docs.retroachievements.org/Users-Code-of-Conduct/>",
      );
    });

    it("shows rule 2 using !rule2 alias", async () => {
      // ARRANGE
      mockMessage.content = "!rule2";

      // ACT
      await ruleCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**2.** Don't use our website or Discord server to share copyrighted material or information about where they can be downloaded.",
      );
    });

    it("shows Code of Conduct using !rulecoc alias", async () => {
      // ARRANGE
      mockMessage.content = "!rulecoc";

      // ACT
      await ruleCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**Complete Version**: <https://docs.retroachievements.org/Users-Code-of-Conduct/>",
      );
    });

    it("shows error and all rules for invalid rule number", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["99"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("**invalid rule**: 99"),
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("__**RULES**__"));
    });

    it("shows error and all rules for invalid rule string", async () => {
      // ARRANGE
      mockMessage.content = "!rule";

      // ACT
      await ruleCommand.execute(mockMessage, ["invalid"], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining("**invalid rule**: invalid"),
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("__**RULES**__"));
    });

    it("handles message with no content split", async () => {
      // ARRANGE
      mockMessage.content = "";

      // ACT
      await ruleCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("__**RULES**__"));
    });

    it("prioritizes alias over argument when both present", async () => {
      // ARRANGE
      mockMessage.content = "!rule3";

      // ACT
      await ruleCommand.execute(mockMessage, ["5"], {} as any);

      // ASSERT
      // Should show rule 3 from alias, not rule 5 from argument
      expect(mockMessage.reply).toHaveBeenCalledWith(
        "**3.** Keep the Discord channels and forum threads on-topic (we do have a section for off-topic chatting, though).",
      );
    });
  });
});
