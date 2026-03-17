import { COLORS } from "../config/constants";
import {
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  SectionBuilder,
  ContainerBuilder,
} from "discord.js";

const buildContactButton = (account: string): ButtonBuilder => {
  return new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel("Message " + account)
    .setURL("https://retroachievements.org/messages/create?to=" + account);
};

export const buildContactEmbed = (): ContainerBuilder => {
  return new ContainerBuilder()
    .setAccentColor(COLORS.PRIMARY)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Contact Us\n" +
          "If you would like to contact us, please send a site message to the appropriate team below.",
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("RAdmin"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: Admins and Moderators\n" +
              "- Reporting offensive behavior.\n" +
              "- Reporting copyrighted material.\n" +
              "- Requesting to be untracked.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("DevCompliance"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: Developer Compliance\n" +
              "- Requesting set approval or early set release.\n" +
              "- Reporting achievements or sets with unwelcome concepts.\n" +
              "- Reporting sets failing to cover basic progression.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("QATeam"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: Quality Assurance\n" +
              "- Reporting a broken set, leaderboard, or rich presence.\n" +
              "- Reporting achievements with grammatical mistakes.\n" +
              "- Requesting a set be playtested.\n" +
              "- Hash compatibility questions.\n" +
              "- Hub organizational questions.\n" +
              "- Getting involved in a QA sub-team.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("RAArtTeam"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: RAArtTeam\n" +
              "- Icon Gauntlets and how to start one.\n" +
              "- Proposing art updates.\n" +
              "- Questions about art-related rule changes.\n" +
              "- Requests for help with creating a new badge or badge set.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("WritingTeam"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: WritingTeam\n" +
              "- Submitting a Play This Set, Wish This Set, or RAdvantage entry.\n" +
              "- Submitting a retrogaming article.\n" +
              "- Proposing a new article idea.\n" +
              "- Getting involved with RANews.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("RANews"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: RANews\n" +
              "- Submitting a Play This Set, Wish This Set, or RAdvantage entry.\n" +
              "- Submitting a retrogaming article.\n" +
              "- Proposing a new article idea.\n" +
              "- Getting involved with RANews.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("RAEvents"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: RAEvents\n" +
              "- Submissions, questions, ideas, or reporting issues related to events.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("DevQuest"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: DevQuest\n" +
              "- Submissions, questions, ideas, or reporting issues related to DevQuest.",
          ),
        ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addSectionComponents(
      new SectionBuilder()
        .setButtonAccessory(buildContactButton("RACheats"))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## :e_mail: RACheats\n" +
              "- If you believe someone is in violation of our [Global Leaderboard and Achievement Hunting Rules](https://docs.retroachievements.org/guidelines/users/global-leaderboard-and-achievement-hunting-rules.html#not-allowed).",
          ),
        ),
    );
};
