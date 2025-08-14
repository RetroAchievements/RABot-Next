import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COLORS } from "../config/constants";
import { createMockMessage } from "../test/mocks/discord.mock";
import { logError } from "../utils/logger";
import contactCommand from "./contact.command";

// Mock the logger
vi.mock("../utils/logger");

describe("Command: contact", () => {
  let mockMessage: ReturnType<typeof createMockMessage>;

  beforeEach(() => {
    mockMessage = createMockMessage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("successfully adds reaction and replies with embed", async () => {
      // ARRANGE
      vi.mocked(mockMessage.react).mockResolvedValue({} as any);

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledWith("📧");
      expect(mockMessage.reply).toHaveBeenCalledOnce();

      // Verify embed structure
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0]?.[0] as any;
      expect(replyCall).toHaveProperty("embeds");
      expect(replyCall.embeds).toHaveLength(1);

      const embed = replyCall.embeds[0];
      expect(embed.data.title).toBe("Contact Us");
      expect(embed.data.description).toBe(
        "If you would like to contact us, please send a site message to the appropriate team below.",
      );
      expect(embed.data.color).toBe(COLORS.PRIMARY);
    });

    it("verifies embed contains all required contact fields", async () => {
      // ARRANGE
      vi.mocked(mockMessage.react).mockResolvedValue({} as any);

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields;

      expect(fields).toHaveLength(9);

      // Check that all expected teams are present
      const fieldNames = fields?.map((field: any) => field.name) || [];
      expect(fieldNames).toContain(":e_mail: Admins and Moderators");
      expect(fieldNames).toContain(":e_mail: Developer Compliance");
      expect(fieldNames).toContain(":e_mail: Quality Assurance");
      expect(fieldNames).toContain(":e_mail: RAArtTeam");
      expect(fieldNames).toContain(":e_mail: WritingTeam");
      expect(fieldNames).toContain(":e_mail: RANews");
      expect(fieldNames).toContain(":e_mail: RAEvents");
      expect(fieldNames).toContain(":e_mail: DevQuest");
      expect(fieldNames).toContain(":e_mail: RACheats");
    });

    it("verifies RAdmin field contains correct information", async () => {
      // ARRANGE
      vi.mocked(mockMessage.react).mockResolvedValue({} as any);

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const rAdminField = embed.data.fields?.find(
        (field: any) => field.name === ":e_mail: Admins and Moderators",
      );

      expect(rAdminField?.value).toContain("Send a message to RAdmin");
      expect(rAdminField?.value).toContain("Reporting offensive behavior");
      expect(rAdminField?.value).toContain("Reporting copyrighted material");
      expect(rAdminField?.value).toContain("Requesting to be untracked");
    });

    it("handles reaction failure and still replies with embed", async () => {
      // ARRANGE
      const reactionError = new Error("Failed to add reaction");
      vi.mocked(mockMessage.react).mockRejectedValue(reactionError);

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(mockMessage.react).toHaveBeenCalledWith("📧");
      expect(logError).toHaveBeenCalledWith(reactionError, {
        event: "contact_command_react_error",
        userId: mockMessage.author.id,
        guildId: mockMessage.guildId,
        channelId: mockMessage.channelId,
      });
      expect(mockMessage.reply).toHaveBeenCalledOnce();

      // Verify embed is still sent
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0]?.[0] as any;
      expect(replyCall).toHaveProperty("embeds");
      expect(replyCall.embeds).toHaveLength(1);
    });

    it("handles reaction failure when guildId is null", async () => {
      // ARRANGE
      const reactionError = new Error("Failed to add reaction");
      vi.mocked(mockMessage.react).mockRejectedValue(reactionError);
      mockMessage.guildId = null;

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      expect(logError).toHaveBeenCalledWith(reactionError, {
        event: "contact_command_react_error",
        userId: mockMessage.author.id,
        guildId: undefined, // Should be undefined when guildId is null
        channelId: mockMessage.channelId,
      });
    });

    it("verifies embed contains correct URLs", async () => {
      // ARRANGE
      vi.mocked(mockMessage.react).mockResolvedValue({} as any);

      // ACT
      await contactCommand.execute(mockMessage, [], {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields || [];

      // Check some key URLs are present
      const devComplianceField = fields.find(
        (field: any) => field.name === ":e_mail: Developer Compliance",
      );
      expect(devComplianceField?.value).toContain(
        "https://retroachievements.org/createmessage.php?t=DevCompliance",
      );

      const qaField = fields.find((field: any) => field.name === ":e_mail: Quality Assurance");
      expect(qaField?.value).toContain("https://retroachievements.org/createmessage.php?t=QATeam");

      const artField = fields.find((field: any) => field.name === ":e_mail: RAArtTeam");
      expect(artField?.value).toContain(
        "https://retroachievements.org/messages/create?to=RAArtTeam",
      );
    });
  });
});
