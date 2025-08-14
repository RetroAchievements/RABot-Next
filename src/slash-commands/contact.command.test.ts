import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COLORS } from "../config/constants";
import { createMockInteraction } from "../test/mocks/discord.mock";
import contactSlashCommand from "./contact.command";

describe("SlashCommand: contact", () => {
  let mockInteraction: ReturnType<typeof createMockInteraction>;

  beforeEach(() => {
    mockInteraction = createMockInteraction({
      commandName: "contact",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("execute", () => {
    it("successfully replies with contact embed", async () => {
      // ACT
      await contactSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      expect(mockInteraction.reply).toHaveBeenCalledOnce();

      // Verify embed structure
      const replyCall = vi.mocked(mockInteraction.reply).mock.calls[0]?.[0] as any;
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
      // ACT
      await contactSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockInteraction.reply).mock.calls[0]?.[0] as any;
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
      // ACT
      await contactSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockInteraction.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const rAdminField = embed.data.fields?.find(
        (field: any) => field.name === ":e_mail: Admins and Moderators",
      );

      expect(rAdminField?.value).toContain("Send a message to RAdmin");
      expect(rAdminField?.value).toContain("Reporting offensive behavior");
      expect(rAdminField?.value).toContain("Reporting copyrighted material");
      expect(rAdminField?.value).toContain("Requesting to be untracked");
    });

    it("verifies embed contains correct URLs", async () => {
      // ACT
      await contactSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockInteraction.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields || [];

      // Check some key URLs are present
      const rAdminField = fields.find(
        (field: any) => field.name === ":e_mail: Admins and Moderators",
      );
      expect(rAdminField?.value).toContain(
        "https://retroachievements.org/createmessage.php?t=RAdmin",
      );

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

      const writingField = fields.find((field: any) => field.name === ":e_mail: WritingTeam");
      expect(writingField?.value).toContain(
        "https://retroachievements.org/messages/create?to=WritingTeam",
      );
    });

    it("verifies specialized team fields contain expected content", async () => {
      // ACT
      await contactSlashCommand.execute(mockInteraction, {} as any);

      // ASSERT
      const replyCall = vi.mocked(mockInteraction.reply).mock.calls[0]?.[0] as any;
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields || [];

      // Check RACheats field contains the specific violation link
      const raCheatsField = fields.find((field: any) => field.name === ":e_mail: RACheats");
      expect(raCheatsField?.value).toContain("Global Leaderboard and Achievement Hunting Rules");
      expect(raCheatsField?.value).toContain("docs.retroachievements.org");

      // Check RANews field contains specific submission types
      const raNewsField = fields.find((field: any) => field.name === ":e_mail: RANews");
      expect(raNewsField?.value).toContain("Play This Set");
      expect(raNewsField?.value).toContain("Wish This Set");
      expect(raNewsField?.value).toContain("RAdvantage");

      // Check Quality Assurance field contains comprehensive services
      const qaField = fields.find((field: any) => field.name === ":e_mail: Quality Assurance");
      expect(qaField?.value).toContain("broken set, leaderboard, or rich presence");
      expect(qaField?.value).toContain("Hash compatibility questions");
      expect(qaField?.value).toContain("Hub organizational questions");
    });

    it("verifies command structure and metadata", () => {
      // ASSERT
      expect(contactSlashCommand.data.name).toBe("contact");
      expect(contactSlashCommand.data.description).toBe(
        "How to contact the RetroAchievements staff",
      );
      expect(contactSlashCommand.legacyName).toBe("contact");
    });
  });
});
